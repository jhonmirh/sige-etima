import { BadRequestException, Body, Controller, Get, Injectable, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AssessmentForm, AttendanceStatus, AttemptStatus, EnrollmentSubjectOrigin, PendingStatus, ResultStatus, Role, StudentCondition } from '@prisma/client';
import { PrismaService } from '../prisma.service'; import { JwtAuthGuard,Roles,RolesGuard } from '../common/security'; import { deriveAcademicDecision } from '../enrollment/enrollment.rules';

@Injectable() export class GradingService{
  constructor(private db:PrismaService){}
  async saveAttempt(assessmentId:string,enrollmentId:string,form:AssessmentForm,data:any){
    const assessment=await this.db.assessment.findUniqueOrThrow({where:{id:assessmentId},include:{teacherAssignment:{include:{section:true}}}});
    const enrollment=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId},include:{curriculumSubjects:{where:{active:true}}}});
    if(enrollment.sectionId!==assessment.teacherAssignment.sectionId) throw new BadRequestException('El estudiante no pertenece a esta sección');
    if(enrollment.curriculumSubjects.length && !enrollment.curriculumSubjects.some(x=>x.studyPlanSubjectId===assessment.teacherAssignment.studyPlanSubjectId)) throw new BadRequestException('La materia no forma parte de las asignaturas activas de esta matrícula');
    if(form===AssessmentForm.SEGUNDA){
      const first=await this.db.assessmentAttempt.findUnique({where:{assessmentId_enrollmentId_form:{assessmentId,enrollmentId,form:AssessmentForm.PRIMERA}}});
      if(!first) throw new BadRequestException('Debe existir primera forma');
      if(first.attendance===AttendanceStatus.INASISTENTE) throw new BadRequestException('Inasistente en primera forma: no tiene derecho a segunda forma');
      const policy=await this.db.gradingPolicy.findUniqueOrThrow({where:{academicYearId:enrollment.academicYearId}});
      if(first.score!==null && Number(first.score)>=Number(policy.passingScore)) throw new BadRequestException('Ya aprobó la primera forma');
    }
    if(data.attendance===AttendanceStatus.INASISTENTE){data.score=null;data.status=AttemptStatus.INASISTENTE}else data.status=AttemptStatus.PRESENTADA;
    if(data.appliedAt)data.appliedAt=new Date(data.appliedAt);
    return this.db.assessmentAttempt.upsert({where:{assessmentId_enrollmentId_form:{assessmentId,enrollmentId,form}},update:data,create:{assessmentId,enrollmentId,form,...data}});
  }
  async closeLapse(enrollmentId:string,teacherAssignmentId:string,lapseId:string){
    const ta=await this.db.teacherAssignment.findUniqueOrThrow({where:{id:teacherAssignmentId},include:{assessments:{where:{lapseId},include:{attempts:{where:{enrollmentId}}}}}});
    const enrollment=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId},include:{curriculumSubjects:{where:{active:true}}}});
    if(enrollment.curriculumSubjects.length && !enrollment.curriculumSubjects.some(x=>x.studyPlanSubjectId===ta.studyPlanSubjectId)) throw new BadRequestException('La materia no forma parte de las asignaturas activas de esta matrícula');
    const policy=await this.db.gradingPolicy.findUniqueOrThrow({where:{academicYearId:enrollment.academicYearId}});
    if(ta.assessments.length<policy.evaluationsMin || ta.assessments.length>policy.evaluationsMax) throw new BadRequestException(`El lapso debe tener entre ${policy.evaluationsMin} y ${policy.evaluationsMax} evaluaciones`);
    let total=0, weight=0;
    for(const a of ta.assessments){
      const first=a.attempts.find(x=>x.form===AssessmentForm.PRIMERA); const second=a.attempts.find(x=>x.form===AssessmentForm.SEGUNDA);
      const chosen=(second?.status===AttemptStatus.PRESENTADA?second:first);
      if(!chosen || chosen.score===null) throw new BadRequestException(`Evaluación ${a.title} sin calificación válida`);
      total+=Number(chosen.score)*Number(a.weight); weight+=Number(a.weight);
    }
    const score=Math.round((total/weight)*100)/100;
    return this.db.lapseGrade.upsert({where:{enrollmentId_teacherAssignmentId_lapseId:{enrollmentId,teacherAssignmentId,lapseId}},update:{score,closedAt:new Date()},create:{enrollmentId,teacherAssignmentId,lapseId,score,closedAt:new Date()}});
  }
  orientationLetter(score:number,policy:any){return score>=Number(policy.orientationAmin)?'A':score>=Number(policy.orientationBmin)?'B':score>=Number(policy.orientationCmin)?'C':'D'}
  async finalizeAnnual(enrollmentId:string,studyPlanSubjectId:string,numericScore:number){
    const e=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId},include:{curriculumSubjects:{where:{active:true}}}});
    if(e.curriculumSubjects.length && !e.curriculumSubjects.some(x=>x.studyPlanSubjectId===studyPlanSubjectId)) throw new BadRequestException('No puede registrar definitiva de una materia que el estudiante no cursa en esta matrícula');
    const p=await this.db.gradingPolicy.findUniqueOrThrow({where:{academicYearId:e.academicYearId}}); const sps=await this.db.studyPlanSubject.findUniqueOrThrow({where:{id:studyPlanSubjectId},include:{subject:true}});
    const status=numericScore>=Number(p.passingScore)?ResultStatus.APROBADO:ResultStatus.REPROBADO; const letter=sps.subject.gradingType==='ORIENTATION_LETTER'?this.orientationLetter(numericScore,p):null;
    return this.db.annualSubjectResult.upsert({where:{enrollmentId_studyPlanSubjectId:{enrollmentId,studyPlanSubjectId}},update:{numericScore,letterScore:letter,status},create:{enrollmentId,studyPlanSubjectId,numericScore,letterScore:letter,status}});
  }
  async recomputeCondition(enrollmentId:string){
    const e=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId},include:{
      annualResults:true,studyPlan:true,
      curriculumSubjects:{where:{active:true},include:{studyPlanSubject:true}},
    }});
    if([StudentCondition.RETIRADO,StudentCondition.RETIRADO_MODIFICADO].includes(e.condition as any)) return e;
    let expectedIds=e.curriculumSubjects.filter(x=>x.origin!==EnrollmentSubjectOrigin.MATERIA_PENDIENTE).map(x=>x.studyPlanSubjectId);
    if(!expectedIds.length){
      const planSubjects=await this.db.studyPlanSubject.findMany({where:{studyPlanId:e.studyPlanId,gradeLevel:e.gradeLevel,active:true},select:{id:true}});
      expectedIds=planSubjects.map(x=>x.id);
    }
    const map=new Map(e.annualResults.map(r=>[r.studyPlanSubjectId,r]));
    const missing=expectedIds.filter(id=>!map.has(id)||map.get(id)?.status===ResultStatus.PENDIENTE);
    if(missing.length) throw new BadRequestException(`La definitiva no está completa. Faltan ${missing.length} materia(s) por cerrar`);
    const failed=expectedIds.map(id=>map.get(id)).filter(r=>r?.status===ResultStatus.REPROBADO).length;
    const p=await this.db.gradingPolicy.findUniqueOrThrow({where:{academicYearId:e.academicYearId}});
    const decision=deriveAcademicDecision({gradeLevel:e.gradeLevel,maxGrade:e.studyPlan.maxGrade,failedCount:failed,pendingMaxSubjects:p.pendingMaxSubjects});
    return this.db.enrollment.update({where:{id:enrollmentId},data:{condition:decision.condition,academicCondition:decision.condition,academicOutcomeFinalizedAt:new Date()}});
  }
  pending(enrollmentId?:string){return this.db.pendingSubject.findMany({where:{enrollmentId},include:{studyPlanSubject:{include:{subject:true}},opportunities:{include:{attempts:true}},reviewAttempts:true,enrollment:{include:{student:true,section:true}}}})}
}

@UseGuards(JwtAuthGuard,RolesGuard) @Controller('grading') export class GradingController{
  constructor(private s:GradingService){}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.DOCENTE) @Post('assessments/:assessmentId/students/:enrollmentId/:form') attempt(@Param('assessmentId')a:string,@Param('enrollmentId')e:string,@Param('form')f:AssessmentForm,@Body()d:any){return this.s.saveAttempt(a,e,f,d)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.DOCENTE) @Post('lapses/:lapseId/assignments/:assignmentId/students/:enrollmentId/close') close(@Param('enrollmentId')e:string,@Param('assignmentId')a:string,@Param('lapseId')l:string){return this.s.closeLapse(e,a,l)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.DOCENTE) @Post('annual/:studyPlanSubjectId/students/:enrollmentId') annual(@Param('enrollmentId')e:string,@Param('studyPlanSubjectId')sps:string,@Body('numericScore')score:number){return this.s.finalizeAnnual(e,sps,Number(score))}
  @Roles(Role.ADMIN,Role.DIRECTOR) @Post('students/:enrollmentId/recompute-condition') condition(@Param('enrollmentId')e:string){return this.s.recomputeCondition(e)}
  @Get('pending') pending(@Query('enrollmentId')e?:string){return this.s.pending(e)}
}
