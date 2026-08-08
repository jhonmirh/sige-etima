import { BadRequestException, Body, Controller, Get, Injectable, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AssessmentForm, AttendanceStatus, AttemptStatus, PendingStatus, ResultStatus, Role, StudentCondition } from '@prisma/client';
import { PrismaService } from '../prisma.service'; import { JwtAuthGuard,Roles,RolesGuard } from '../common/security';

@Injectable() export class GradingService{
  constructor(private db:PrismaService){}
  async saveAttempt(assessmentId:string,enrollmentId:string,form:AssessmentForm,data:any){
    const assessment=await this.db.assessment.findUniqueOrThrow({where:{id:assessmentId},include:{teacherAssignment:{include:{section:true}}}});
    const enrollment=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId}});
    if(enrollment.sectionId!==assessment.teacherAssignment.sectionId) throw new BadRequestException('El estudiante no pertenece a esta sección');
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
    const enrollment=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId}});
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
    const e=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId}}); const p=await this.db.gradingPolicy.findUniqueOrThrow({where:{academicYearId:e.academicYearId}}); const sps=await this.db.studyPlanSubject.findUniqueOrThrow({where:{id:studyPlanSubjectId},include:{subject:true}});
    const status=numericScore>=Number(p.passingScore)?ResultStatus.APROBADO:ResultStatus.REPROBADO; const letter=sps.subject.gradingType==='ORIENTATION_LETTER'?this.orientationLetter(numericScore,p):null;
    return this.db.annualSubjectResult.upsert({where:{enrollmentId_studyPlanSubjectId:{enrollmentId,studyPlanSubjectId}},update:{numericScore,letterScore:letter,status},create:{enrollmentId,studyPlanSubjectId,numericScore,letterScore:letter,status}});
  }
  async recomputeCondition(enrollmentId:string){
    const e=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId},include:{annualResults:true,studyPlan:true}}); if([StudentCondition.RETIRADO,StudentCondition.RETIRADO_MODIFICADO].includes(e.condition as any)) return e;
    const failed=e.annualResults.filter(r=>r.status===ResultStatus.REPROBADO).length; const p=await this.db.gradingPolicy.findUniqueOrThrow({where:{academicYearId:e.academicYearId}});
    const condition=failed===0?StudentCondition.REGULAR:failed<=p.pendingMaxSubjects?StudentCondition.MATERIA_PENDIENTE:StudentCondition.REPITIENTE;
    return this.db.enrollment.update({where:{id:enrollmentId},data:{condition}});
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
