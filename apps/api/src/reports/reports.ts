import { Controller, ForbiddenException, Get, Injectable, Param, Query, Res, UseGuards } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaService } from '../prisma.service'; import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/security'; import { automaticRosterLockDate } from '../common/school-calendar'; import type { Response } from 'express'; import ExcelJS from 'exceljs'; import PDFDocument from 'pdfkit'; import { Role, StudentCondition } from '@prisma/client';
function age(d:Date,at=new Date()){let a=at.getFullYear()-d.getFullYear(); const m=at.getMonth()-d.getMonth(); if(m<0||(m===0&&at.getDate()<d.getDate()))a--; return a;}
export function publicBrandAsset(webPath?:string|null){
  if(!webPath)return null;
  const relative=webPath.replace(/^\/+/, '');
  const publicRoot=path.resolve(process.cwd(),'../web/public');
  const full=path.resolve(publicRoot,relative);
  if(!full.startsWith(`${publicRoot}${path.sep}`)||!fs.existsSync(full))return null;
  try{
    const realRoot=fs.realpathSync(publicRoot);
    const realFile=fs.realpathSync(full);
    if(!realFile.startsWith(`${realRoot}${path.sep}`)||!fs.statSync(realFile).isFile())return null;
    return realFile;
  }catch{
    return null;
  }
}
function officialHeader(doc:any,inst:any){
  const school=publicBrandAsset(inst.schoolLogoPath||'/brand/escudo.png');
  const ministry=publicBrandAsset(inst.ministryLogoPath||'/brand/ministerio-identidad.png');
  if(school) doc.image(school,55,38,{fit:[72,82],align:'center',valign:'center'});
  if(ministry) doc.image(ministry,325,48,{fit:[215,70],align:'right',valign:'center'});
  doc.y=132;
  doc.fontSize(9).text('REPÚBLICA BOLIVARIANA DE VENEZUELA',{align:'center'});
  doc.fontSize(10).text('MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN',{align:'center'});
  doc.fontSize(10).text(inst.name.toUpperCase(),{align:'center'});
  if(inst.plantCode) doc.fontSize(9).text(`CÓDIGO DE PLANTEL ${inst.plantCode}`,{align:'center'});
  doc.moveDown(1.5);
}

@Injectable() export class ReportsService{
 constructor(private db:PrismaService){}

 private async staffIdForUser(user:any){
  if(!user?.sub)return null;
  const row=await this.db.user.findUnique({where:{id:user.sub},select:{staffId:true}});
  return row?.staffId||null;
 }
 async dashboard(yearId?:string){const year=yearId?await this.db.academicYear.findUnique({where:{id:yearId}}):await this.db.academicYear.findFirst({where:{active:true}}); if(!year)return {}; const [total,withdrawn,reps,byGrade,byCondition,contrib]=await Promise.all([this.db.enrollment.count({where:{academicYearId:year.id}}),this.db.withdrawal.count({where:{enrollment:{academicYearId:year.id}}}),this.db.representative.count({where:{students:{some:{student:{enrollments:{some:{academicYearId:year.id}}}}}}}),this.db.enrollment.groupBy({by:['gradeLevel'],where:{academicYearId:year.id},_count:true,orderBy:{gradeLevel:'asc'}}),this.db.enrollment.groupBy({by:['condition'],where:{academicYearId:year.id},_count:true}),this.db.contribution.aggregate({where:{academicYearId:year.id},_sum:{amount:true}})]);return {year,total,withdrawn,representatives:reps,byGrade,byCondition,contributions:Number(contrib._sum.amount||0)}}
 async roster(sectionId:string){
  const section=await this.db.section.findUniqueOrThrow({where:{id:sectionId},include:{academicYear:true}});
  const lock=automaticRosterLockDate(section.academicYear.startDate);
  const rows=await this.db.enrollment.findMany({where:{sectionId},orderBy:{listNumber:'asc'},include:{student:true,section:true,studyPlan:true,withdrawal:true}});
  return rows.filter((r:any)=>!r.withdrawal || new Date(r.withdrawal.withdrawalDate).getTime()>=lock.getTime());
 }
 async statistics(yearId:string){const rows=await this.db.enrollment.findMany({where:{academicYearId:yearId,condition:{in:['REGULAR','MATERIA_PENDIENTE','REPITIENTE']}},include:{student:true,section:true,studyPlan:true}}); return rows.map(r=>({number:r.listNumber,nationality:r.student.nationality,identity:r.student.identityNumber,name:[r.student.firstName,r.student.middleName,r.student.lastName,r.student.secondLastName].filter(Boolean).join(' '),grade:r.gradeLevel,mention:r.section.mentionName||null,section:r.section.name,modality:r.studyPlan.modality,sex:r.student.sex,age:age(r.student.birthDate),condition:r.condition}));}
 async xlsxRoster(sectionId:string,res:Response){const rows=await this.roster(sectionId); const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Nómina'); ws.columns=[{header:'N°',key:'n',width:8},{header:'Cédula',key:'id',width:18},{header:'Apellidos y nombres',key:'name',width:42},{header:'Sexo',key:'sex',width:12},{header:'Condición',key:'condition',width:24}]; rows.forEach(r=>ws.addRow({n:r.listNumber,id:r.student.identityNumber||r.student.schoolIdentityNumber,name:`${r.student.lastName} ${r.student.secondLastName||''}, ${r.student.firstName} ${r.student.middleName||''}`,sex:r.student.sex,condition:r.condition})); res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition','attachment; filename=nomina.xlsx'); await wb.xlsx.write(res); res.end();}
 async xlsxAssignmentRoster(assignmentId:string,user:any,res:Response){
  const assignment=await this.db.teacherAssignment.findUniqueOrThrow({
   where:{id:assignmentId},
   include:{
    staff:true,
    section:{include:{academicYear:true,studyPlan:true}},
    studyPlanSubject:{include:{subject:true}},
   }
  });
  if(user?.role===Role.DOCENTE){
   const staffId=await this.staffIdForUser(user);
   if(!staffId||staffId!==assignment.staffId) throw new ForbiddenException('Esta asignación no pertenece al docente autenticado');
  }
  const rows=await this.db.enrollment.findMany({
   where:{sectionId:assignment.sectionId,condition:{in:[StudentCondition.REGULAR,StudentCondition.MATERIA_PENDIENTE,StudentCondition.REPITIENTE]}},
   include:{student:true,curriculumSubjects:{where:{active:true}}},
   orderBy:[{listNumber:'asc'},{registrationDate:'asc'}],
  });
  const eligible=rows.filter((e:any)=>!e.curriculumSubjects.length||e.curriculumSubjects.some((c:any)=>c.studyPlanSubjectId===assignment.studyPlanSubjectId));
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('Nómina');
  ws.addRow(['AÑO ESCOLAR',assignment.section.academicYear.name]);
  ws.addRow(['DOCENTE',`${assignment.staff.firstName} ${assignment.staff.middleName||''} ${assignment.staff.lastName} ${assignment.staff.secondLastName||''}`.replace(/\s+/g,' ').trim()]);
  ws.addRow(['MATERIA',assignment.studyPlanSubject.subject.name]);
  ws.addRow(['SECCIÓN',`${assignment.section.gradeLevel}° · ${assignment.section.name}`]);
  ws.addRow(['PLAN',`${assignment.section.studyPlan.code} · ${assignment.section.studyPlan.name}`]);
  ws.addRow([]);
  const header=ws.addRow(['N°','CÉDULA','APELLIDOS Y NOMBRES','SEXO','CONDICIÓN']);
  header.font={bold:true};
  eligible.forEach((r:any)=>ws.addRow([
   r.listNumber??'PROV.',
   r.student.identityNumber||r.student.schoolIdentityNumber||'',
   `${r.student.lastName} ${r.student.secondLastName||''}, ${r.student.firstName} ${r.student.middleName||''}`.replace(/\s+/g,' ').trim(),
   r.student.sex,
   r.condition,
  ]));
  ws.columns=[{width:9},{width:18},{width:44},{width:14},{width:24}];
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',`attachment; filename=nomina-${assignment.section.gradeLevel}-${assignment.section.name.replace(/[^a-zA-Z0-9]+/g,'-')}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
 }

 async studyCertificate(enrollmentId:string,res:Response){const e=await this.db.enrollment.findUniqueOrThrow({where:{id:enrollmentId},include:{student:true,section:true,studyPlan:true}}); const inst=await this.db.institution.findFirstOrThrow(); const sr=await this.db.studentRepresentative.findFirst({where:{studentId:e.studentId,isPrimary:true},include:{representative:true}}); const doc=new PDFDocument({size:'A4',margins:{top:55,left:55,right:55,bottom:55}}); res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition','inline; filename=constancia-estudio.pdf'); doc.pipe(res); officialHeader(doc,inst); doc.fontSize(16).text('CONSTANCIA DE ESTUDIO',{align:'center'}).moveDown(2); const s=e.student; const rep=sr?.representative; doc.fontSize(11).text(`Quien suscribe ${inst.directorTitle||''} ${inst.directorName||'DIRECTOR(A)'}, titular de la cédula de identidad ${inst.directorIdentity||''}, Director(a) de ${inst.name}, hace constar que el/la estudiante ${s.firstName} ${s.middleName||''} ${s.lastName} ${s.secondLastName||''}, titular de la cédula ${s.identityNumber||s.schoolIdentityNumber||''}, nacido(a) en ${s.birthPlace}, en fecha ${s.birthDate.toLocaleDateString('es-VE')}, se encuentra INSCRITO(A) en ${e.gradeLevel}° año, sección ${e.section.name}${e.section.mentionName?`, mención ${e.section.mentionName}`:''}, bajo el plan ${e.studyPlan.code} (${e.studyPlan.name}), representado(a) por ${rep?`${rep.firstName} ${rep.lastName}`:'representante registrado'}.`,{align:'justify',lineGap:5}); doc.moveDown(2).text(`Constancia que se expide a los ${new Date().toLocaleDateString('es-VE')}.`,{align:'center'}).moveDown(6).text(`${inst.directorName||'DIRECTOR(A)'}\nDIRECTOR(A)\n${inst.directorPhone||''}\n${inst.directorEmail||''}`,{align:'center'}); doc.end();}
 async workCertificate(staffId:string,res:Response){const s=await this.db.staff.findUniqueOrThrow({where:{id:staffId}}); const inst=await this.db.institution.findFirstOrThrow(); const doc=new PDFDocument({size:'A4',margins:{top:55,left:55,right:55,bottom:55}}); res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition','inline; filename=constancia-trabajo.pdf'); doc.pipe(res); officialHeader(doc,inst); doc.fontSize(16).text('CONSTANCIA DE TRABAJO',{align:'center'}).moveDown(2); doc.fontSize(11).text(`Quien suscribe ${inst.directorTitle||''} ${inst.directorName||'DIRECTOR(A)'}, Director(a) de ${inst.name}, HACE CONSTAR: que el/la ciudadano(a) ${s.firstName} ${s.middleName||''} ${s.lastName} ${s.secondLastName||''}, titular de la cédula ${s.nationality==='VENEZOLANO'?'V':'E'}-${s.identityNumber}, labora en esta institución como ${s.cargoDescription||s.institutionalFunction||'personal activo'}, código de cargo ${s.cargoCode||'N/A'}, cumpliendo funciones físicamente en esta institución.`,{align:'justify',lineGap:5}); doc.moveDown(2).text(`Constancia que se expide a los ${new Date().toLocaleDateString('es-VE')}.`,{align:'center'}).moveDown(6).text(`${inst.directorName||'DIRECTOR(A)'}\nDIRECTOR(A)`,{align:'center'}); doc.end();}
}
@UseGuards(JwtAuthGuard,RolesGuard)
@Controller('reports')
export class ReportsController{
 constructor(private s:ReportsService){}

 @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA)
 @Get('dashboard')
 dashboard(@Query('academicYearId')y?:string){return this.s.dashboard(y)}

 @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA)
 @Get('statistics')
 stats(@Query('academicYearId')y:string){return this.s.statistics(y)}

 @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA)
 @Get('roster/:sectionId')
 roster(@Param('sectionId')id:string){return this.s.roster(id)}

 @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA)
 @Get('roster/:sectionId.xlsx')
 xlsx(@Param('sectionId')id:string,@Res()res:Response){return this.s.xlsxRoster(id,res)}

 @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA,Role.DOCENTE)
 @Get('assignment/:assignmentId.xlsx')
 assignmentXlsx(@Param('assignmentId')id:string,@CurrentUser()user:any,@Res()res:Response){return this.s.xlsxAssignmentRoster(id,user,res)}

 @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA)
 @Get('study-certificate/:enrollmentId.pdf')
 cert(@Param('enrollmentId')id:string,@Res()res:Response){return this.s.studyCertificate(id,res)}

 @Roles(Role.ADMIN,Role.DIRECTOR,Role.SECRETARIA)
 @Get('work-certificate/:staffId.pdf')
 work(@Param('staffId')id:string,@Res()res:Response){return this.s.workCertificate(id,res)}
}
