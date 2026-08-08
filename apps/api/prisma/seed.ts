import { PrismaClient, Role, EducationModality, GradingType, Nationality } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const db = new PrismaClient();

const states = [
  'Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes','Delta Amacuro','Distrito Capital','Falcón','Guárico','Lara','La Guaira','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa','Sucre','Táchira','Trujillo','Yaracuy','Zulia'
];

async function subject(code:string,name:string,gradingType:GradingType=GradingType.NUMERIC){
  return db.subject.upsert({where:{code},update:{name,gradingType},create:{code,name,gradingType}});
}

async function main(){
  for (const name of states) await db.federalState.upsert({where:{name},update:{},create:{name}});

  const adminEmail=process.env.SEED_ADMIN_EMAIL || 'admin@etima.local';
  const adminPassword=process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const hash=await bcrypt.hash(adminPassword,12);
  await db.user.upsert({where:{email:adminEmail}, update:{active:true,role:Role.ADMIN}, create:{email:adminEmail,passwordHash:hash,role:Role.ADMIN}});

  const general=await db.studyPlan.upsert({
    where:{code_effectiveFrom:{code:'31059',effectiveFrom:new Date('2021-09-01')}},
    update:{active:true},
    create:{code:'31059',name:'Plan de estudio Bachiller',modality:EducationModality.MEDIA_GENERAL,maxGrade:5,titleName:'Bachiller',effectiveFrom:new Date('2021-09-01')}
  });
  const technical=await db.studyPlan.upsert({
    where:{code_effectiveFrom:{code:'41049',effectiveFrom:new Date('2021-09-01')}},
    update:{active:true},
    create:{code:'41049',name:'Técnicos Profesionales en Agropecuaria - Ciencias Agrícolas y Pecuarias',modality:EducationModality.MEDIA_TECNICA,maxGrade:6,titleName:'Técnico Profesional en Agropecuaria, mención Ciencias Agrícolas y Pecuarias',effectiveFrom:new Date('2021-09-01')}
  });

  const generalRows:any[]=[
    ['31059-CAS','Castellano',[4,4,4,4,4]],
    ['31059-ING','Inglés y otras lenguas extranjeras',[6,6,6,4,4]],
    ['31059-MAT','Matemáticas',[4,4,4,4,4]],
    ['31059-EFI','Educación Física',[6,6,6,6,6]],
    ['31059-ART','Arte y Patrimonio',[4,4,null,null,null]],
    ['31059-CNA','Ciencias Naturales',[6,6,null,null,null]],
    ['31059-FIS','Física',[null,null,4,4,4]],
    ['31059-QUI','Química',[null,null,4,4,4]],
    ['31059-BIO','Biología',[null,null,4,4,4]],
    ['31059-CTI','Ciencias de la Tierra',[null,null,null,null,2]],
    ['31059-GHC','Geografía, Historia y Ciudadanía',[6,6,6,4,4]],
    ['31059-FSN','Formación para la Soberanía Nacional',[null,null,null,2,2]],
    ['31059-ORI','Orientación y Convivencia',[2,2,2,2,2],GradingType.ORIENTATION_LETTER],
    ['31059-GRP','Participación en los grupos de creación, recreación y producción',[6,6,6,6,6]]
  ];
  for (let i=0;i<generalRows.length;i++){
    const [code,name,hours,gt]=generalRows[i]; const s=await subject(code,name,gt||GradingType.NUMERIC);
    for(let g=1;g<=5;g++) if(hours[g-1]!=null) await db.studyPlanSubject.upsert({
      where:{studyPlanId_subjectId_gradeLevel:{studyPlanId:general.id,subjectId:s.id,gradeLevel:g}},
      update:{weeklyHours:hours[g-1],sortOrder:i},
      create:{studyPlanId:general.id,subjectId:s.id,gradeLevel:g,weeklyHours:hours[g-1],sortOrder:i}
    });
  }

  const techRows:any[]=[
    ['41049-LYL','Lengua y Literatura',[3,3,4,4,4,null],'FORMACIÓN GENERAL'],
    ['41049-MAT','Matemática',[4,4,4,4,4,null],'FORMACIÓN GENERAL'],
    ['41049-IDI','Idiomas',[3,3,4,4,4,null],'FORMACIÓN GENERAL'],
    ['41049-EFI','Educación Física',[2,2,2,null,null,null],'FORMACIÓN GENERAL'],
    ['41049-BAT','Biología, Ambiente y Tecnología',[4,4,8,8,8,null],'FORMACIÓN GENERAL'],
    ['41049-GHS','Geografía, Historia y Soberanía Nacional',[4,4,2,2,2,null],'FORMACIÓN GENERAL'],
    ['41049-PES','Proyecto de Economía Socioproductiva y Tecnología (común a todas las especialidades y menciones)',[8,8,8,8,8,null],'FORMACIÓN CIENTÍFICA, TECNOLÓGICA Y PRODUCTIVA'],
    ['41049-AFM','Área de formación relacionada con la mención',[8,8,8,10,10,null],'FORMACIÓN CIENTÍFICA, TECNOLÓGICA Y PRODUCTIVA'],
    ['41049-OVS','Orientación y Vinculación Sociolaboral',[4,4,2,2,2,null],'PRÁCTICA VOCACIONAL Y PROFESIONAL'],
    ['41049-PRA','Práctica Profesional',[null,null,null,null,null,null],'PRÁCTICA VOCACIONAL Y PROFESIONAL',1440]
  ];
  for(let i=0;i<techRows.length;i++){
    const [code,name,hours,component,annualHours]=techRows[i]; const s=await subject(code,name);
    for(let g=1;g<=6;g++){
      if(g===6 && code==='41049-PRA'){
        await db.studyPlanSubject.upsert({where:{studyPlanId_subjectId_gradeLevel:{studyPlanId:technical.id,subjectId:s.id,gradeLevel:6}},update:{annualHours:1440,component,sortOrder:i},create:{studyPlanId:technical.id,subjectId:s.id,gradeLevel:6,annualHours:1440,component,sortOrder:i}})
      } else if(hours[g-1]!=null) {
        await db.studyPlanSubject.upsert({where:{studyPlanId_subjectId_gradeLevel:{studyPlanId:technical.id,subjectId:s.id,gradeLevel:g}},update:{weeklyHours:hours[g-1],component,sortOrder:i},create:{studyPlanId:technical.id,subjectId:s.id,gradeLevel:g,weeklyHours:hours[g-1],component,sortOrder:i}})
      }
    }
  }

  const year=await db.academicYear.upsert({where:{name:'2026-2027'},update:{},create:{name:'2026-2027',startDate:new Date('2026-10-01'),endDate:new Date('2027-08-31'),enrollmentCloseDate:new Date('2026-10-31T23:59:59'),active:true,contributionAmount:0}});
  await db.gradingPolicy.upsert({where:{academicYearId:year.id},update:{},create:{academicYearId:year.id}});
  for(let n=1;n<=3;n++) await db.pedagogicalLapse.upsert({where:{academicYearId_number:{academicYearId:year.id,number:n}},update:{},create:{academicYearId:year.id,number:n,startDate:new Date(2026,9+(n-1)*3,1),endDate:new Date(2026,11+(n-1)*3,20)}});

  await db.institution.upsert({
    where:{id:'00000000-0000-0000-0000-000000000001'},
    update:{},
    create:{id:'00000000-0000-0000-0000-000000000001',name:'ET Isaías Medina Angarita',plantCode:'S0955D2016',statisticalCode:'200554',dependencyCode:'18007911070',address:'Configurar dirección institucional',schoolLogoPath:'/brand/escudo.png',ministryLogoPath:'/brand/ministerio.png'}
  });
  console.log('Seed SIGE-ETIMA completado');
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());
