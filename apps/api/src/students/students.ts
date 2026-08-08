import { Body, Controller, Get, Injectable, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LivingWith, Nationality, Role, Sex } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/security';

export class CreateStudentDto{
  @IsEnum(Nationality) nationality!:Nationality; @IsOptional() @IsString() identityNumber?:string; @IsOptional() @IsString() schoolIdentityNumber?:string;
  @IsString() firstName!:string; @IsOptional() @IsString() middleName?:string; @IsString() lastName!:string; @IsOptional() @IsString() secondLastName?:string;
  @IsEnum(Sex) sex!:Sex; @IsOptional() @IsString() phone?:string; @IsOptional() @IsEmail() email?:string;
  @IsString() birthPlace!:string; @IsOptional() @IsString() birthStateId?:string; @IsDateString() birthDate!:string; @IsString() address!:string;
  @IsOptional() @IsString() motherName?:string; @IsOptional() @IsString() fatherName?:string; @IsOptional() @IsString() motherIdentity?:string; @IsOptional() @IsString() fatherIdentity?:string;
  @IsOptional() @IsString() motherAddress?:string; @IsOptional() @IsString() fatherAddress?:string; @IsEnum(LivingWith) livingWith!:LivingWith;
  @IsOptional() @IsString() bloodType?:string; @IsOptional() @IsBoolean() disability?:boolean; @IsOptional() @IsBoolean() medicalReport?:boolean;
  @IsOptional() @IsBoolean() allergy?:boolean; @IsOptional() @IsString() allergyDetails?:string; @IsOptional() @IsString() destinationSchool?:string; @IsOptional() @IsString() observations?:string;
}
export class AnthropometricDto{ @IsInt() @Min(50) @Max(250) heightCm!:number; @IsInt() @Min(10000) @Max(300000) weightGrams!:number; @IsOptional() @IsString() shirtSize?:string; @IsOptional() @IsString() pantSize?:string; @IsOptional() @IsInt() @Min(20) @Max(46) shoeSize?:number; @IsOptional() @IsString() enrollmentId?:string; }

@Injectable() export class StudentsService{
  constructor(private db:PrismaService){}
  list(search?:string){return this.db.student.findMany({where:search?{OR:[{firstName:{contains:search,mode:'insensitive'}},{lastName:{contains:search,mode:'insensitive'}},{identityNumber:{contains:search}}]}:{},orderBy:[{lastName:'asc'},{firstName:'asc'}],include:{enrollments:{include:{academicYear:true,section:true,studyPlan:true}},representatives:{include:{representative:true}}}});}
  get(id:string){return this.db.student.findUniqueOrThrow({where:{id},include:{enrollments:{include:{academicYear:true,section:true,studyPlan:true,withdrawal:true}},representatives:{include:{representative:true}},emergencyContacts:true,anthropometrics:{orderBy:{measuredAt:'desc'}},documents:true}});}
  create(dto:CreateStudentDto){return this.db.student.create({data:{...dto,birthDate:new Date(dto.birthDate)}});}
  update(id:string,dto:Partial<CreateStudentDto>){const data:any={...dto}; if(dto.birthDate)data.birthDate=new Date(dto.birthDate); return this.db.student.update({where:{id},data});}
  addAnthropometric(id:string,dto:AnthropometricDto){return this.db.anthropometricRecord.create({data:{studentId:id,...dto}});}
}

@UseGuards(JwtAuthGuard,RolesGuard) @Controller('students') export class StudentsController{
  constructor(private s:StudentsService){}
  @Get() list(@Query('search') search?:string){return this.s.list(search)}
  @Get(':id') get(@Param('id') id:string){return this.s.get(id)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post() create(@Body() dto:CreateStudentDto){return this.s.create(dto)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Patch(':id') update(@Param('id')id:string,@Body()dto:Partial<CreateStudentDto>){return this.s.update(id,dto)}
  @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA) @Post(':id/anthropometrics') anthro(@Param('id')id:string,@Body()dto:AnthropometricDto){return this.s.addAnthropometric(id,dto)}
}
