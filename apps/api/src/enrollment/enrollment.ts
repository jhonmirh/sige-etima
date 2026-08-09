import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  EnrollmentSubjectOrigin,
  Nationality,
  PendingStatus,
  ResultStatus,
  Role,
  StudentCondition,
  WithdrawalType,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/security';
import { automaticEnrollmentCloseDate, parseSchoolCalendarDate } from '../common/school-calendar';
import { deriveAcademicDecision } from './enrollment.rules';

const PHONE_REGEX=/^\d{10,15}$/;
const GARMENT_SIZES=['10','11','12','13','14','15','16','S','M','L','XL','2XL','3XL'];
const ENTRY_LITERALS=['A','B','C','D'];
const LAST_APPROVED_BY_PLAN:Record<string,string[]>={
  '31059':['1° AÑO','2° AÑO','3° AÑO','4° AÑO'],
  '41049':['1° AÑO','2° AÑO','3° AÑO','4° AÑO','5° AÑO'],
};

class EnrollDto{
  @IsString() studentId!:string;
  @IsString() academicYearId!:string;
  @IsString() studyPlanId!:string;
  @IsString() sectionId!:string;
  @IsInt() @Min(1) @Max(6) gradeLevel!:number;
  @IsOptional() @IsDateString() registrationDate?:string;
  @IsOptional() @IsString() lastApprovedYear?:string;
  @IsOptional() @IsIn(ENTRY_LITERALS) literal?:string;
  @IsOptional() @IsInt() @Min(50) @Max(250) heightCm?:number;
  @IsOptional() @IsInt() @Min(10000) @Max(300000) weightGrams?:number;
  @IsOptional() @IsIn(GARMENT_SIZES) shirtSize?:string;
  @IsOptional() @IsIn(GARMENT_SIZES) pantSize?:string;
  @IsOptional() @IsInt() @Min(20) @Max(46) shoeSize?:number;
}

class ReEnrollDto{
  @IsString() studentId!:string;
  @IsString() targetAcademicYearId!:string;
  @IsString() sectionId!:string;
  @IsOptional() @IsDateString() registrationDate?:string;
  @IsOptional() @IsString() address?:string;
  @IsOptional() @IsString() @Matches(PHONE_REGEX,{message:'El teléfono debe contener entre 10 y 15 dígitos'}) phone?:string;
  @IsOptional() @IsEmail() email?:string;
  @IsOptional() @IsInt() @Min(50) @Max(250) heightCm?:number;
  @IsOptional() @IsInt() @Min(10000) @Max(300000) weightGrams?:number;
  @IsOptional() @IsIn(GARMENT_SIZES) shirtSize?:string;
  @IsOptional() @IsIn(GARMENT_SIZES) pantSize?:string;
  @IsOptional() @IsInt() @Min(20) @Max(46) shoeSize?:number;
}

class WithdrawDto{
  @IsDateString() withdrawalDate!:string;
  @IsString() reason!:string;
  @IsString() destinationInstitution!:string;
}

@Injectable()
export class EnrollmentService{
  constructor(private db:PrismaService){}

  private normalizeUpper(value?:string|null){return value?.trim()?value.trim().replace(/\s+/g,' ').toLocaleUpperCase('es-VE'):undefined}

  private sortByIdentity(a:any,b:any){
    const ai=a.student?.identityNumber?Number(a.student.identityNumber):Number.MAX_SAFE_INTEGER;
    const bi=b.student?.identityNumber?Number(b.student.identityNumber):Number.MAX_SAFE_INTEGER;
    if(ai!==bi) return ai-bi;
    const last=String(a.student?.lastName||'').localeCompare(String(b.student?.lastName||''),'es');
    if(last!==0) return last;
    return String(a.student?.firstName||'').localeCompare(String(b.student?.firstName||''),'es');
  }

  private async requireRepresentative(studentId:string){
    const count=await this.db.studentRepresentative.count({where:{studentId,representative:{active:true}}});
    if(!count) throw new BadRequestException('El estudiante debe tener al menos un representante activo vinculado antes de formalizar la matrícula');
  }

  private async nextListNumber(sectionId:string){
    const max=await this.db.enrollment.aggregate({where:{sectionId},_max:{listNumber:true}});
    return (max._max.listNumber||0)+1;
  }

  private isOnOrAfterEnrollmentClose(year:any,date:Date){
    const close=automaticEnrollmentCloseDate(year.startDate);
    return date.getTime()>=close.getTime();
  }

  private isLateOrLocked(section:any,year:any,date:Date){
    return !!section.rosterLockedAt || this.isOnOrAfterEnrollmentClose(year,date);
  }

  private async expectedSubjects(previous:any){
    const existing=(previous.curriculumSubjects||[]).filter((x:any)=>x.active && x.origin!==EnrollmentSubjectOrigin.MATERIA_PENDIENTE);
    if(existing.length) return existing.map((x:any)=>x.studyPlanSubject);
    return this.db.studyPlanSubject.findMany({
      where:{studyPlanId:previous.studyPlanId,gradeLevel:previous.gradeLevel,active:true},
      include:{subject:true},
      orderBy:{sortOrder:'asc'},
    });
  }

  private async buildOutcome(previous:any){
    const expected=await this.expectedSubjects(previous);
    const resultMap = new Map<string, any>(
      (previous.annualResults || []).map((r:any): [string, any] => [r.studyPlanSubjectId, r]),
    );
    const missing=expected.filter((s:any)=>!resultMap.has(s.id) || resultMap.get(s.id)?.status===ResultStatus.PENDIENTE);
    const relevantResults=expected.map((s:any)=>resultMap.get(s.id)).filter(Boolean) as any[];
    const failed=relevantResults.filter((r:any)=>r.status===ResultStatus.REPROBADO);
    const unresolvedPending=(previous.pendingSubjects||[]).filter((p:any)=>p.status!==PendingStatus.APROBADA);
    const policy=await this.db.gradingPolicy.findUnique({where:{academicYearId:previous.academicYearId}});
    const pendingMaxSubjects=policy?.pendingMaxSubjects??2;
    const decision=deriveAcademicDecision({
      gradeLevel:previous.gradeLevel,
      maxGrade:previous.studyPlan.maxGrade,
      failedCount:failed.length,
      pendingMaxSubjects,
    });
    return {
      expected,
      relevantResults,
      failed,
      missing,
      unresolvedPending,
      complete:expected.length>0 && missing.length===0 && unresolvedPending.length===0,
      decision,
    };
  }

  private async subjectsForNext(previous:any,outcome:any){
    const d=outcome.decision;
    if(d.curriculumPolicy==='GRADUATE' || d.graduationEligible || d.targetGradeLevel===null) return [];
    const failedSubjects=outcome.failed.map((r:any)=>({
      studyPlanSubjectId:r.studyPlanSubjectId,
      origin:d.condition===StudentCondition.REPITIENTE?EnrollmentSubjectOrigin.REPITENCIA:EnrollmentSubjectOrigin.MATERIA_PENDIENTE,
      sourceEnrollmentId:previous.id,
      subject:r.studyPlanSubject.subject,
      gradeLevel:r.studyPlanSubject.gradeLevel,
      studyPlanSubject:r.studyPlanSubject,
    }));
    if(d.curriculumPolicy==='FAILED_ONLY' || d.curriculumPolicy==='PENDING_ONLY') return failedSubjects;
    const regular=await this.db.studyPlanSubject.findMany({
      where:{studyPlanId:previous.studyPlanId,gradeLevel:d.targetGradeLevel,active:true},
      include:{subject:true},orderBy:{sortOrder:'asc'},
    });
    const regularMapped=regular.map((s:any)=>({studyPlanSubjectId:s.id,origin:EnrollmentSubjectOrigin.PLAN_ACTUAL,sourceEnrollmentId:null,subject:s.subject,gradeLevel:s.gradeLevel,studyPlanSubject:s}));
    if(d.curriculumPolicy==='NEXT_GRADE_PLUS_PENDING') return [...regularMapped,...failedSubjects];
    return regularMapped;
  }

  private async previousEnrollmentFor(studentId:string,targetYear:any){
    return this.db.enrollment.findFirst({
      where:{studentId,academicYear:{startDate:{lt:targetYear.startDate}}},
      orderBy:{academicYear:{startDate:'desc'}},
      include:{
        academicYear:true,
        studyPlan:true,
        section:true,
        annualResults:{include:{studyPlanSubject:{include:{subject:true}}}},
        curriculumSubjects:{where:{active:true},include:{studyPlanSubject:{include:{subject:true}}}},
        pendingSubjects:{include:{studyPlanSubject:{include:{subject:true}}}},
        withdrawal:true,
      },
    });
  }

  async reEnrollmentLookup(nationality:Nationality,identityNumber:string,targetAcademicYearId:string){
    if(!targetAcademicYearId) throw new BadRequestException('Debe seleccionar el año escolar destino');
    if(!Object.values(Nationality).includes(nationality)) throw new BadRequestException('Nacionalidad inválida');
    if(!/^\d+$/.test(identityNumber||'')) throw new BadRequestException('La cédula debe contener únicamente números');
    const targetYear=await this.db.academicYear.findUniqueOrThrow({where:{id:targetAcademicYearId}});
    const student=await this.db.student.findFirst({
      where:{nationality,identityNumber},
      include:{
        representatives:{include:{representative:true},orderBy:{isPrimary:'desc'}},
        anthropometrics:{orderBy:{measuredAt:'desc'},take:1},
        enrollments:{include:{academicYear:true,studyPlan:true,section:true},orderBy:{academicYear:{startDate:'desc'}},take:8},
      },
    });
    if(!student) throw new BadRequestException('No se encontró un estudiante con esa nacionalidad y cédula');
    const already=await this.db.enrollment.findUnique({where:{studentId_academicYearId:{studentId:student.id,academicYearId:targetAcademicYearId}},include:{academicYear:true,studyPlan:true,section:true}});
    const previous=await this.previousEnrollmentFor(student.id,targetYear);
    if(!previous){
      return {student,targetAcademicYear:targetYear,alreadyEnrolled:already||null,previousEnrollment:null,recommendation:null,message:'El estudiante no posee una matrícula anterior que pueda generar reinscripción automática.'};
    }
    const outcome=await this.buildOutcome(previous);
    const subjects=outcome.complete?await this.subjectsForNext(previous,outcome):[];
    const sections=outcome.complete && outcome.decision.targetGradeLevel!==null?await this.db.section.findMany({
      where:{
        academicYearId:targetAcademicYearId,
        studyPlanId:previous.studyPlanId,
        gradeLevel:outcome.decision.targetGradeLevel,
        mentionId:previous.section.mentionId ?? null,
      },
      include:{mention:true},
      orderBy:{name:'asc'},
    }):[];
    const suggestedSection=sections.find((s:any)=>s.name.trim().toUpperCase()===previous.section.name.trim().toUpperCase())||sections[0]||null;
    return {
      student,
      targetAcademicYear:targetYear,
      alreadyEnrolled:already||null,
      previousEnrollment:previous,
      academicOutcome:{
        complete:outcome.complete,
        expectedCount:outcome.expected.length,
        resultCount:outcome.relevantResults.length,
        missingSubjects:outcome.missing.map((x:any)=>({id:x.id,name:x.subject.name})),
        unresolvedPendingSubjects:outcome.unresolvedPending.map((x:any)=>({id:x.id,name:x.studyPlanSubject.subject.name,status:x.status})),
        failedSubjects:outcome.failed.map((r:any)=>({studyPlanSubjectId:r.studyPlanSubjectId,name:r.studyPlanSubject.subject.name,numericScore:r.numericScore,letterScore:r.letterScore,status:r.status,gradeLevel:r.studyPlanSubject.gradeLevel})),
      },
      recommendation:outcome.complete?{
        condition:outcome.decision.condition,
        targetGradeLevel:outcome.decision.targetGradeLevel,
        graduationEligible:outcome.decision.graduationEligible,
        studyPlanId:previous.studyPlanId,
        studyPlan:previous.studyPlan,
        mentionId:previous.section.mentionId || null,
        mentionName:previous.section.mentionName || null,
        suggestedSection,
        sections,
        subjects:subjects.map((x:any)=>({studyPlanSubjectId:x.studyPlanSubjectId,name:x.subject.name,origin:x.origin,gradeLevel:x.gradeLevel})),
      }:null,
    };
  }

  async enroll(d:EnrollDto){
    await this.requireRepresentative(d.studentId);
    const [year,section,student,plan]=await Promise.all([
      this.db.academicYear.findUniqueOrThrow({where:{id:d.academicYearId}}),
      this.db.section.findUniqueOrThrow({where:{id:d.sectionId}}),
      this.db.student.findUniqueOrThrow({where:{id:d.studentId}}),
      this.db.studyPlan.findUniqueOrThrow({where:{id:d.studyPlanId}}),
    ]);
    if(!student.active) throw new BadRequestException('El estudiante está inactivo');
    if(section.academicYearId!==d.academicYearId || section.studyPlanId!==d.studyPlanId || section.gradeLevel!==d.gradeLevel) throw new BadRequestException('Sección incompatible con año, plan o grado');
    const normalizedLastApproved=this.normalizeUpper(d.lastApprovedYear);
    const allowedLastApproved=LAST_APPROVED_BY_PLAN[plan.code];
    if(normalizedLastApproved && allowedLastApproved && !allowedLastApproved.includes(normalizedLastApproved)) throw new BadRequestException(`Último año aprobado inválido para el plan ${plan.code}`);
    if(d.gradeLevel>1 && d.literal) throw new BadRequestException('El literal solo se permite en la inscripción de 1° año');
    const existing=await this.db.enrollment.findUnique({where:{studentId_academicYearId:{studentId:d.studentId,academicYearId:d.academicYearId}}});
    if(existing) throw new ConflictException('El estudiante ya posee matrícula en este año escolar');
    const planSubjects=await this.db.studyPlanSubject.findMany({where:{studyPlanId:d.studyPlanId,gradeLevel:d.gradeLevel,active:true}});
    if(!planSubjects.length) throw new BadRequestException('El plan seleccionado no tiene materias configuradas para este grado');
    const date=parseSchoolCalendarDate(d.registrationDate);
    if(!section.rosterLockedAt && this.isOnOrAfterEnrollmentClose(year,date)){
      await this.lockRoster(section.id,date);
      section.rosterLockedAt=new Date();
    }
    const late=this.isLateOrLocked(section,year,date);
    const listNumber=late?await this.nextListNumber(d.sectionId):null;
    return this.db.$transaction(async tx=>{
      const enrollment=await tx.enrollment.create({data:{
        studentId:d.studentId,academicYearId:d.academicYearId,studyPlanId:d.studyPlanId,sectionId:d.sectionId,gradeLevel:d.gradeLevel,
        registrationDate:date,lastApprovedYear:normalizedLastApproved,literal:d.gradeLevel===1?this.normalizeUpper(d.literal):undefined,isLateEnrollment:late,listNumber,
      }});
      await tx.enrollmentSubject.createMany({data:planSubjects.map(s=>({enrollmentId:enrollment.id,studyPlanSubjectId:s.id,origin:EnrollmentSubjectOrigin.PLAN_ACTUAL}))});
      if(d.heightCm!==undefined && d.weightGrams!==undefined){
        await tx.anthropometricRecord.create({data:{studentId:d.studentId,enrollmentId:enrollment.id,heightCm:d.heightCm,weightGrams:d.weightGrams,shirtSize:d.shirtSize,pantSize:d.pantSize,shoeSize:d.shoeSize}});
      }
      return tx.enrollment.findUnique({where:{id:enrollment.id},include:{student:true,academicYear:true,section:true,studyPlan:true,curriculumSubjects:{include:{studyPlanSubject:{include:{subject:true}}}}}});
    });
  }

  async reEnroll(d:ReEnrollDto){
    await this.requireRepresentative(d.studentId);
    const targetYear=await this.db.academicYear.findUniqueOrThrow({where:{id:d.targetAcademicYearId}});
    const existing=await this.db.enrollment.findUnique({where:{studentId_academicYearId:{studentId:d.studentId,academicYearId:d.targetAcademicYearId}}});
    if(existing) throw new ConflictException('El estudiante ya está inscrito en el año escolar seleccionado');
    const previous=await this.previousEnrollmentFor(d.studentId,targetYear);
    if(!previous) throw new BadRequestException('No existe una matrícula anterior válida para reinscribir al estudiante');
    const outcome=await this.buildOutcome(previous);
    if(!outcome.complete){
      const details=[
        outcome.missing.length?`${outcome.missing.length} materia(s) sin definitiva`:null,
        outcome.unresolvedPending.length?`${outcome.unresolvedPending.length} materia(s) pendiente(s) sin resolver`:null,
      ].filter(Boolean).join(' y ');
      throw new BadRequestException(`El cierre académico del año anterior no está completo: ${details}.`);
    }
    if(outcome.decision.graduationEligible) throw new BadRequestException('El estudiante aprobó el último grado del plan y es elegible para graduación; no corresponde reinscripción al siguiente año.');
    const section=await this.db.section.findUniqueOrThrow({where:{id:d.sectionId}});
    if(section.academicYearId!==d.targetAcademicYearId || section.studyPlanId!==previous.studyPlanId || section.gradeLevel!==outcome.decision.targetGradeLevel) throw new BadRequestException('La sección seleccionada no corresponde al año, plan o grado calculado por la definitiva');
    if((section.mentionId||null)!==(previous.section.mentionId||null)) throw new BadRequestException('La reinscripción ordinaria debe conservar la misma mención del plan de estudio. Un cambio de mención requiere un procedimiento administrativo especial.');
    const subjects=await this.subjectsForNext(previous,outcome);
    if(!subjects.length) throw new BadRequestException('No existen materias a cursar según la definitiva del año anterior');
    const date=parseSchoolCalendarDate(d.registrationDate);
    if(!section.rosterLockedAt && this.isOnOrAfterEnrollmentClose(targetYear,date)){
      await this.lockRoster(section.id,date);
      section.rosterLockedAt=new Date();
    }
    const late=this.isLateOrLocked(section,targetYear,date);
    const listNumber=late?await this.nextListNumber(section.id):null;
    return this.db.$transaction(async tx=>{
      const studentData:any={};
      if(d.address!==undefined) studentData.address=this.normalizeUpper(d.address);
      if(d.phone!==undefined) studentData.phone=d.phone;
      if(d.email!==undefined) studentData.email=d.email.trim().toLowerCase();
      if(Object.keys(studentData).length) await tx.student.update({where:{id:d.studentId},data:studentData});

      await tx.enrollment.update({where:{id:previous.id},data:{
        academicCondition:outcome.decision.condition,
        academicOutcomeFinalizedAt:new Date(),
        ...(previous.condition===StudentCondition.INACTIVO?{}:{condition:outcome.decision.condition}),
      }});
      const enrollment=await tx.enrollment.create({data:{
        studentId:d.studentId,
        academicYearId:d.targetAcademicYearId,
        studyPlanId:previous.studyPlanId,
        sectionId:section.id,
        gradeLevel:outcome.decision.targetGradeLevel!,
        registrationDate:date,
        listNumber,
        isLateEnrollment:late,
        condition:outcome.decision.condition,
        previousEnrollmentId:previous.id,
        lastApprovedYear:outcome.decision.condition===StudentCondition.REPITIENTE?previous.lastApprovedYear:`${previous.gradeLevel}° AÑO`,
      }});
      await tx.enrollmentSubject.createMany({data:subjects.map((s:any)=>({
        enrollmentId:enrollment.id,
        studyPlanSubjectId:s.studyPlanSubjectId,
        origin:s.origin,
        sourceEnrollmentId:s.sourceEnrollmentId,
      }))});

      if(outcome.decision.condition===StudentCondition.MATERIA_PENDIENTE){
        for(const failed of outcome.failed){
          await tx.pendingSubject.create({data:{
            enrollmentId:enrollment.id,
            studyPlanSubjectId:failed.studyPlanSubjectId,
            sourceAcademicYear:previous.academicYear.name,
            opportunities:{create:[
              {sequence:1,label:'OCTUBRE'},
              {sequence:2,label:'DICIEMBRE'},
              {sequence:3,label:'FEBRERO'},
              {sequence:4,label:'MARZO'},
            ]},
          }});
        }
      }
      if(d.heightCm!==undefined && d.weightGrams!==undefined){
        await tx.anthropometricRecord.create({data:{studentId:d.studentId,enrollmentId:enrollment.id,heightCm:d.heightCm,weightGrams:d.weightGrams,shirtSize:d.shirtSize,pantSize:d.pantSize,shoeSize:d.shoeSize}});
      }
      return tx.enrollment.findUnique({where:{id:enrollment.id},include:{
        student:true,academicYear:true,section:true,studyPlan:true,previousEnrollment:{include:{academicYear:true,section:true}},
        curriculumSubjects:{include:{studyPlanSubject:{include:{subject:true}}}},pendingSubjects:{include:{studyPlanSubject:{include:{subject:true}},opportunities:true}},
      }});
    });
  }

  async lockRoster(sectionId:string,effectiveDate:Date=new Date()){
    const section=await this.db.section.findUniqueOrThrow({where:{id:sectionId},include:{academicYear:true}});
    if(section.rosterLockedAt) return this.roster(sectionId,false);
    const close=automaticEnrollmentCloseDate(section.academicYear.startDate);
    if(effectiveDate.getTime()<close.getTime()){
      throw new BadRequestException(`La nómina permanece provisional hasta la fecha de cierre de matrícula ${close.toLocaleDateString('es-VE')}`);
    }
    const items=await this.db.enrollment.findMany({where:{sectionId},include:{student:true}});
    const initial=items.filter((x:any)=>new Date(x.registrationDate).getTime()<close.getTime());
    const postClose=items.filter((x:any)=>new Date(x.registrationDate).getTime()>=close.getTime());
    initial.sort((a:any,b:any)=>this.sortByIdentity(a,b));
    postClose.sort((a:any,b:any)=>{
      const byDate=new Date(a.registrationDate).getTime()-new Date(b.registrationDate).getTime();
      return byDate!==0?byDate:this.sortByIdentity(a,b);
    });
    const ordered=[...initial,...postClose];
    await this.db.$transaction(async tx=>{
      // Limpiamos primero la numeración para evitar colisiones con el índice único de sección+número.
      await tx.enrollment.updateMany({where:{sectionId},data:{listNumber:null}});
      for(let i=0;i<ordered.length;i++) await tx.enrollment.update({where:{id:ordered[i].id},data:{listNumber:i+1}});
      await tx.section.update({where:{id:sectionId},data:{rosterLockedAt:new Date()}});
    });
    return this.roster(sectionId,false);
  }

  async ensureYearRostersLockedIfDue(yearId:string,effectiveDate:Date=new Date()){
    const year=await this.db.academicYear.findUnique({where:{id:yearId}});
    if(!year) return;
    const close=automaticEnrollmentCloseDate(year.startDate);
    if(effectiveDate.getTime()<close.getTime()) return;
    const sections=await this.db.section.findMany({where:{academicYearId:yearId,rosterLockedAt:null},select:{id:true}});
    for(const section of sections) await this.lockRoster(section.id,effectiveDate);
  }

  private async provisionalNumberMap(sectionIds:string[]){
    const result=new Map<string,number>();
    if(!sectionIds.length) return result;
    const rows=await this.db.enrollment.findMany({where:{sectionId:{in:sectionIds}},include:{student:true}});
    const groups=new Map<string,any[]>();
    for(const row of rows){
      const group=groups.get(row.sectionId)||[];
      group.push(row);
      groups.set(row.sectionId,group);
    }
    for(const group of groups.values()){
      group.sort((a:any,b:any)=>this.sortByIdentity(a,b));
      group.forEach((row:any,index:number)=>result.set(row.id,index+1));
    }
    return result;
  }

  async roster(sectionId:string,autoLock=true){
    let section=await this.db.section.findUniqueOrThrow({where:{id:sectionId},include:{academicYear:true}});
    if(autoLock && !section.rosterLockedAt && this.isOnOrAfterEnrollmentClose(section.academicYear,new Date())){
      await this.lockRoster(sectionId,new Date());
      section=await this.db.section.findUniqueOrThrow({where:{id:sectionId},include:{academicYear:true}});
    }
    const rows=await this.db.enrollment.findMany({where:{sectionId},include:{student:true,withdrawal:true,studyPlan:true,section:true,curriculumSubjects:{where:{active:true},include:{studyPlanSubject:{include:{subject:true}}}}}});
    if(section.rosterLockedAt){
      rows.sort((a:any,b:any)=>(a.listNumber??Number.MAX_SAFE_INTEGER)-(b.listNumber??Number.MAX_SAFE_INTEGER));
      return rows.map((row:any)=>({...row,displayListNumber:row.listNumber,rosterStatus:'FIJA'}));
    }
    rows.sort((a:any,b:any)=>this.sortByIdentity(a,b));
    return rows.map((row:any,index:number)=>({...row,displayListNumber:index+1,rosterStatus:'PROVISIONAL'}));
  }

  async withdraw(id:string,d:WithdrawDto){
    const e=await this.db.enrollment.findUniqueOrThrow({where:{id},include:{academicYear:true}}); const wd=new Date(d.withdrawalDate);
    const start=new Date(e.academicYear.startDate), end=new Date(e.academicYear.endDate);
    if(wd<start || wd>end) throw new BadRequestException('La fecha de retiro debe estar dentro del año escolar');
    const threshold=new Date(start); threshold.setDate(threshold.getDate()+30);
    const type=wd<=threshold?WithdrawalType.PRIMEROS_30_DIAS:WithdrawalType.RESTO_ANO;
    const condition=type===WithdrawalType.PRIMEROS_30_DIAS?StudentCondition.RETIRADO:StudentCondition.RETIRADO_MODIFICADO;
    return this.db.$transaction(async tx=>{await tx.enrollment.update({where:{id},data:{condition}});return tx.withdrawal.upsert({where:{enrollmentId:id},update:{...d,withdrawalDate:wd,type,destinationInstitution:this.normalizeUpper(d.destinationInstitution),reason:this.normalizeUpper(d.reason)!},create:{enrollmentId:id,withdrawalDate:wd,type,destinationInstitution:this.normalizeUpper(d.destinationInstitution),reason:this.normalizeUpper(d.reason)!}})});
  }

  updateCondition(id:string,condition:StudentCondition){return this.db.enrollment.update({where:{id},data:{condition}})}

  async graduate(id:string){
    const e=await this.db.enrollment.findUniqueOrThrow({where:{id},include:{studyPlan:true,annualResults:{include:{studyPlanSubject:{include:{subject:true}}}},curriculumSubjects:{where:{active:true},include:{studyPlanSubject:{include:{subject:true}}}}}});
    if(e.gradeLevel<e.studyPlan.maxGrade) throw new BadRequestException('Solo puede graduarse un estudiante que curse el último grado del plan');
    const outcome=await this.buildOutcome(e);
    if(!outcome.complete || !outcome.decision.graduationEligible) throw new BadRequestException('El estudiante no tiene una definitiva completa y aprobada para graduación');
    return this.db.enrollment.update({where:{id},data:{condition:StudentCondition.GRADUADO,academicCondition:StudentCondition.REGULAR,academicOutcomeFinalizedAt:new Date()}});
  }

  async inactivateYear(yearId:string){
    await this.db.academicYear.findUniqueOrThrow({where:{id:yearId}});
    const eligible=[StudentCondition.REGULAR,StudentCondition.MATERIA_PENDIENTE,StudentCondition.REPITIENTE];
    return this.db.enrollment.updateMany({where:{academicYearId:yearId,condition:{in:eligible}},data:{condition:StudentCondition.INACTIVO}});
  }

  async get(id:string){return this.db.enrollment.findUniqueOrThrow({where:{id},include:{
    student:{include:{representatives:{include:{representative:true},orderBy:{isPrimary:'desc'}},anthropometrics:{orderBy:{measuredAt:'desc'},take:5}}},
    academicYear:true,studyPlan:true,section:true,withdrawal:true,previousEnrollment:{include:{academicYear:true,section:true,studyPlan:true}},
    curriculumSubjects:{where:{active:true},include:{studyPlanSubject:{include:{subject:true}}},orderBy:{createdAt:'asc'}},
    pendingSubjects:{include:{studyPlanSubject:{include:{subject:true}},opportunities:{include:{attempts:true}},reviewAttempts:true}},
    annualResults:{include:{studyPlanSubject:{include:{subject:true}}}},
  }})}

  async list(year?:string,condition?:StudentCondition,search?:string,sectionId?:string){
    const q=search?.trim();
    if(year) await this.ensureYearRostersLockedIfDue(year,new Date());
    const rows=await this.db.enrollment.findMany({
      where:{
        academicYearId:year||undefined,condition:condition||undefined,sectionId:sectionId||undefined,
        ...(q?{student:{OR:[{identityNumber:{contains:q}},{schoolIdentityNumber:{contains:q,mode:'insensitive'}},{firstName:{contains:q,mode:'insensitive'}},{lastName:{contains:q,mode:'insensitive'}},{secondLastName:{contains:q,mode:'insensitive'}}]}}:{}),
      },
      include:{student:true,section:true,studyPlan:true,academicYear:true,withdrawal:true,curriculumSubjects:{where:{active:true},select:{id:true,origin:true}}},
    });
    const unlockedSectionIds=[...new Set(rows.filter((r:any)=>!r.section.rosterLockedAt).map((r:any)=>r.sectionId))] as string[];
    const provisional=await this.provisionalNumberMap(unlockedSectionIds);
    const decorated=rows.map((row:any)=>({
      ...row,
      displayListNumber:row.section.rosterLockedAt?row.listNumber:provisional.get(row.id),
      rosterStatus:row.section.rosterLockedAt?'FIJA':'PROVISIONAL',
    }));
    decorated.sort((a:any,b:any)=>{
      const byYear=new Date(b.academicYear.startDate).getTime()-new Date(a.academicYear.startDate).getTime();
      if(byYear!==0) return byYear;
      const byPlan=String(a.studyPlan.code||a.studyPlan.name).localeCompare(String(b.studyPlan.code||b.studyPlan.name),'es');
      if(byPlan!==0) return byPlan;
      if(a.gradeLevel!==b.gradeLevel) return a.gradeLevel-b.gradeLevel;
      const byMention=String(a.section.mentionName||'').localeCompare(String(b.section.mentionName||''),'es');
      if(byMention!==0) return byMention;
      const bySection=String(a.section.name).localeCompare(String(b.section.name),'es');
      if(bySection!==0) return bySection;
      return (a.displayListNumber??Number.MAX_SAFE_INTEGER)-(b.displayListNumber??Number.MAX_SAFE_INTEGER);
    });
    return decorated;
  }
}

@UseGuards(JwtAuthGuard,RolesGuard)
@Controller('enrollments')
export class EnrollmentController{
  constructor(private s:EnrollmentService){}
  @Get() list(@Query('academicYearId')year?:string,@Query('condition')condition?:StudentCondition,@Query('search')search?:string,@Query('sectionId')sectionId?:string){return this.s.list(year,condition,search,sectionId)}
  @Get('re-enrollment/lookup') lookup(@Query('nationality')nationality:Nationality,@Query('identityNumber')identityNumber:string,@Query('targetAcademicYearId')targetAcademicYearId:string){return this.s.reEnrollmentLookup(nationality,identityNumber,targetAcademicYearId)}
  @Get('roster/:sectionId') roster(@Param('sectionId')id:string){return this.s.roster(id)}
  @Get(':id') get(@Param('id')id:string){return this.s.get(id)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post() create(@Body()dto:EnrollDto){return this.s.enroll(dto)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post('re-enrollment') reEnroll(@Body()dto:ReEnrollDto){return this.s.reEnroll(dto)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post('roster/:sectionId/lock') lock(@Param('sectionId')id:string){return this.s.lockRoster(id)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post(':id/withdraw') withdraw(@Param('id')id:string,@Body()dto:WithdrawDto){return this.s.withdraw(id,dto)}
  @Roles(Role.ADMIN,Role.DIRECTOR) @Patch(':id/condition') condition(@Param('id')id:string,@Body('condition')c:StudentCondition){return this.s.updateCondition(id,c)}
  @Roles(Role.ADMIN,Role.DIRECTOR) @Post('year/:yearId/inactivate') inactivateYear(@Param('yearId')yearId:string){return this.s.inactivateYear(yearId)}
  @Roles(Role.ADMIN,Role.DIRECTOR) @Post(':id/graduate') graduate(@Param('id')id:string){return this.s.graduate(id)}
}
