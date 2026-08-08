import { BadRequestException, Body, Controller, Get, Injectable, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Role, StudentCondition, WithdrawalType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/security';

class EnrollDto{ @IsString() studentId!:string; @IsString() academicYearId!:string; @IsString() studyPlanId!:string; @IsString() sectionId!:string; @IsInt() gradeLevel!:number; @IsOptional() @IsDateString() registrationDate?:string; @IsOptional() @IsString() lastApprovedYear?:string; @IsOptional() @IsString() literal?:string; }
class WithdrawDto{ @IsDateString() withdrawalDate!:string; @IsString() reason!:string; @IsOptional() @IsString() destinationInstitution?:string; }

@Injectable() export class EnrollmentService{
  constructor(private db:PrismaService){}
  async enroll(d:EnrollDto){
    const [year,section]=await Promise.all([this.db.academicYear.findUniqueOrThrow({where:{id:d.academicYearId}}),this.db.section.findUniqueOrThrow({where:{id:d.sectionId}})]);
    if(section.academicYearId!==d.academicYearId || section.studyPlanId!==d.studyPlanId || section.gradeLevel!==d.gradeLevel) throw new BadRequestException('Sección incompatible con año, plan o grado');
    const date=d.registrationDate?new Date(d.registrationDate):new Date();
    const late=!!year.enrollmentCloseDate && date>year.enrollmentCloseDate;
    const max=await this.db.enrollment.aggregate({where:{sectionId:d.sectionId},_max:{listNumber:true}});
    return this.db.enrollment.create({data:{...d,registrationDate:date,isLateEnrollment:late,listNumber:late?(max._max.listNumber||0)+1:undefined}});
  }
  async lockRoster(sectionId:string){
    const section=await this.db.section.findUniqueOrThrow({where:{id:sectionId},include:{academicYear:true}});
    const now=new Date();
    if(section.academicYear.enrollmentCloseDate && now>section.academicYear.enrollmentCloseDate) throw new BadRequestException('La fecha de cierre ya pasó; la nómina inicial no puede reordenarse');
    const items=await this.db.enrollment.findMany({where:{sectionId},include:{student:true},orderBy:[{student:{identityNumber:'asc'}},{student:{lastName:'asc'}}]});
    await this.db.$transaction(items.map((e,i)=>this.db.enrollment.update({where:{id:e.id},data:{listNumber:i+1}})));
    return this.roster(sectionId);
  }
  roster(sectionId:string){return this.db.enrollment.findMany({where:{sectionId},orderBy:{listNumber:'asc'},include:{student:true,withdrawal:true,studyPlan:true,section:true}})}
  async withdraw(id:string,d:WithdrawDto){
    const e=await this.db.enrollment.findUniqueOrThrow({where:{id},include:{academicYear:true}}); const wd=new Date(d.withdrawalDate);
    const threshold=new Date(e.academicYear.startDate); threshold.setDate(threshold.getDate()+30);
    const type=wd<=threshold?WithdrawalType.PRIMEROS_30_DIAS:WithdrawalType.RESTO_ANO;
    const condition=type===WithdrawalType.PRIMEROS_30_DIAS?StudentCondition.RETIRADO:StudentCondition.RETIRADO_MODIFICADO;
    return this.db.$transaction(async tx=>{await tx.enrollment.update({where:{id},data:{condition}});return tx.withdrawal.upsert({where:{enrollmentId:id},update:{...d,withdrawalDate:wd,type},create:{enrollmentId:id,...d,withdrawalDate:wd,type}})});
  }
  updateCondition(id:string,condition:StudentCondition){return this.db.enrollment.update({where:{id},data:{condition}})}
  list(year?:string,condition?:StudentCondition){return this.db.enrollment.findMany({where:{academicYearId:year,condition},include:{student:true,section:true,studyPlan:true,withdrawal:true},orderBy:[{section:{gradeLevel:'asc'}},{section:{name:'asc'}},{listNumber:'asc'}]})}
}

@UseGuards(JwtAuthGuard,RolesGuard) @Controller('enrollments') export class EnrollmentController{
  constructor(private s:EnrollmentService){}
  @Get() list(@Query('academicYearId')year?:string,@Query('condition')condition?:StudentCondition){return this.s.list(year,condition)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post() create(@Body()dto:EnrollDto){return this.s.enroll(dto)}
  @Get('roster/:sectionId') roster(@Param('sectionId')id:string){return this.s.roster(id)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post('roster/:sectionId/lock') lock(@Param('sectionId')id:string){return this.s.lockRoster(id)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post(':id/withdraw') withdraw(@Param('id')id:string,@Body()dto:WithdrawDto){return this.s.withdraw(id,dto)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Patch(':id/condition') condition(@Param('id')id:string,@Body('condition')c:StudentCondition){return this.s.updateCondition(id,c)}
}
