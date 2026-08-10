import { PrismaClient, Role, EducationModality, GradingType, Nationality } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { OFFICIAL_STUDY_PLAN_CATALOG, GENERAL_31059_CURRICULUM, GENERAL_31060_CURRICULUM, technicalCurriculum, CurriculumRow } from '../src/academic/official-plan-catalog';
const db = new PrismaClient();

const states = [
  'Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes','Delta Amacuro','Distrito Capital','Falcón','Guárico','Lara','La Guaira','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa','Sucre','Táchira','Trujillo','Yaracuy','Zulia'
];

const ARCGIS_GEOGRAPHY_URL = 'https://venezuela360.org/server/rest/services/Hosted/Parroquias/FeatureServer/0/query?where=1%3D1&outFields=estado%2Cmunicipio%2Cparroquia&returnGeometry=false&resultRecordCount=2000&f=json';
const GITHUB_GEOGRAPHY_URL = 'https://raw.githubusercontent.com/zokeber/venezuela-json/refs/heads/master/venezuela.json';

type GeographyRow = { state: string; municipality: string; parish: string };

function key(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
}

function cleanName(value:string){
  return value.trim().replace(/\s+/g,' ').replace(/[.]+$/,'').toLocaleUpperCase('es-VE');
}

function canonicalState(value:string){
  const aliases:Record<string,string> = { VARGAS: 'La Guaira' };
  const normalized=key(value);
  if(aliases[normalized]) return aliases[normalized];
  return states.find((x)=>key(x)===normalized) || value.trim();
}

async function fetchGeographyRows():Promise<GeographyRow[]>{
  try{
    const response=await fetch(ARCGIS_GEOGRAPHY_URL,{signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const data:any=await response.json();
    const rows=(data.features||[]).map((f:any)=>({
      state:String(f.attributes?.estado||''),
      municipality:String(f.attributes?.municipio||''),
      parish:String(f.attributes?.parroquia||''),
    })).filter((r:GeographyRow)=>r.state&&r.municipality&&r.parish);
    if(rows.length) return rows;
  }catch(error:any){
    console.warn(`No fue posible leer Venezuela360: ${error?.message||error}`);
  }

  const response=await fetch(GITHUB_GEOGRAPHY_URL,{signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error(`No fue posible descargar catálogo territorial de respaldo: HTTP ${response.status}`);
  const data:any[]=await response.json();
  return data.flatMap((state:any)=>(state.municipios||[]).flatMap((municipality:any)=>(municipality.parroquias||[]).map((parish:string)=>({
    state:String(state.estado||''), municipality:String(municipality.municipio||''), parish:String(parish||'')
  })))).filter((r:GeographyRow)=>r.state&&r.municipality&&r.parish);
}

async function seedGeography(){
  const [municipalityCount,parishCount]=await Promise.all([db.municipality.count(),db.parish.count()]);
  if(municipalityCount>=300 && parishCount>=800){
    console.log(`Catálogo territorial disponible: ${municipalityCount} municipios / ${parishCount} parroquias`);
    return;
  }

  try{
    const rows=await fetchGeographyRows();
    const grouped=new Map<string,Map<string,Set<string>>>();
    for(const row of rows){
      const stateName=canonicalState(row.state);
      const municipalityName=cleanName(row.municipality);
      const parishName=cleanName(row.parish);
      if(!states.some((x)=>key(x)===key(stateName)) || !municipalityName || !parishName) continue;
      if(!grouped.has(stateName)) grouped.set(stateName,new Map());
      const municipalities=grouped.get(stateName)!;
      if(!municipalities.has(municipalityName)) municipalities.set(municipalityName,new Set());
      municipalities.get(municipalityName)!.add(parishName);
    }

    for(const stateName of states){
      const state=await db.federalState.upsert({where:{name:stateName},update:{},create:{name:stateName}});
      const municipalities=grouped.get(stateName);
      if(!municipalities) continue;
      for(const [municipalityName,parishes] of municipalities){
        const municipality=await db.municipality.upsert({
          where:{stateId_name:{stateId:state.id,name:municipalityName}},
          update:{},create:{stateId:state.id,name:municipalityName}
        });
        await db.parish.createMany({
          data:[...parishes].map((name)=>({municipalityId:municipality.id,name})),
          skipDuplicates:true,
        });
      }
    }
    const [m,p]=await Promise.all([db.municipality.count(),db.parish.count()]);
    console.log(`Catálogo territorial cargado: ${m} municipios / ${p} parroquias`);
  }catch(error:any){
    console.warn(`ADVERTENCIA: no se pudo completar el catálogo territorial: ${error?.message||error}`);
  }
}

async function subject(code:string,name:string,gradingType:GradingType=GradingType.NUMERIC){
  return db.subject.upsert({where:{code},update:{name,gradingType},create:{code,name,gradingType}});
}

async function main(){
  for (const name of states) await db.federalState.upsert({where:{name},update:{},create:{name}});
  await seedGeography();

  const adminEmail=process.env.SEED_ADMIN_EMAIL || 'admin@etima.local';
  const adminPassword=process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const hash=await bcrypt.hash(adminPassword,12);
  await db.user.upsert({where:{email:adminEmail}, update:{active:true,role:Role.ADMIN}, create:{email:adminEmail,passwordHash:hash,role:Role.ADMIN}});

  async function seedPlanCurriculum(plan:any, rows:CurriculumRow[]){
    for(let i=0;i<rows.length;i++){
      const row=rows[i];
      const gradingType=row.gradingType==='ORIENTATION_LETTER'?GradingType.ORIENTATION_LETTER:GradingType.NUMERIC;
      const s=await subject(`${plan.code}-${row.suffix}`,row.name,gradingType);
      for(let g=1;g<=plan.maxGrade;g++){
        const weekly=row.hours[g-1]??null;
        const annual=g===6?row.annualHoursAtSixth??null:null;
        if(weekly===null && annual===null) continue;
        await db.studyPlanSubject.upsert({
          where:{studyPlanId_subjectId_gradeLevel:{studyPlanId:plan.id,subjectId:s.id,gradeLevel:g}},
          update:{weeklyHours:weekly,annualHours:annual,component:row.component,sortOrder:i,active:true},
          create:{studyPlanId:plan.id,subjectId:s.id,gradeLevel:g,weeklyHours:weekly,annualHours:annual,component:row.component,sortOrder:i,active:true},
        });
      }
    }
  }

  const planByCode=new Map<string,any>();
  for(const template of OFFICIAL_STUDY_PLAN_CATALOG){
    const effectiveFrom=template.code==='31059'?new Date('2017-08-24'):template.code==='31060'?new Date('2023-10-19'):new Date('2023-10-20');
    const modality=template.modality==='MEDIA_TECNICA'?EducationModality.MEDIA_TECNICA:EducationModality.MEDIA_GENERAL;
    const desiredActive=template.code==='31059' || template.code==='41049';
    const existing=await db.studyPlan.findFirst({where:{code:template.code},orderBy:{effectiveFrom:'desc'}});
    const plan=existing
      ? await db.studyPlan.update({where:{id:existing.id},data:{
          name:template.optionName,modality,specialtyName:template.specialtyName,optionName:template.optionName,hasMention:template.hasMention,
          officialCatalog:true,sourceReference:template.sourceReference,curriculumVerified:true,maxGrade:template.maxGrade,titleName:template.titleName,
        }})
      : await db.studyPlan.create({data:{
          code:template.code,name:template.optionName,modality,specialtyName:template.specialtyName,optionName:template.optionName,hasMention:template.hasMention,
          officialCatalog:true,sourceReference:template.sourceReference,curriculumVerified:true,maxGrade:template.maxGrade,titleName:template.titleName,
          active:desiredActive,effectiveFrom,
        }});
    planByCode.set(template.code,plan);

    if(template.hasMention && template.mentionName){
      const mentionName=template.mentionName.toLocaleUpperCase('es-VE');
      const mention=await db.mention.findUnique({where:{studyPlanId_name:{studyPlanId:plan.id,name:mentionName}}});
      if(!mention) await db.mention.create({data:{studyPlanId:plan.id,name:mentionName,active:true}});
    }

    const rows=template.code==='31059'
      ? GENERAL_31059_CURRICULUM
      : template.code==='31060'
        ? GENERAL_31060_CURRICULUM
        : technicalCurriculum(template.optionName);
    await seedPlanCurriculum(plan,rows);
  }

  const general=planByCode.get('31059');
  const technical=planByCode.get('41049');
  if(!general || !technical) throw new Error('No fue posible cargar los planes institucionales 31059/41049');

  // Compatibilidad con datos creados antes de que BACHILLER se tratara como plan sin mención.
  let generalMention=await db.mention.findUnique({where:{studyPlanId_name:{studyPlanId:general.id,name:'BACHILLER'}}});
  if(!generalMention) generalMention=await db.mention.create({data:{studyPlanId:general.id,name:'BACHILLER',active:true}});
  let technicalMention=await db.mention.findUnique({where:{studyPlanId_name:{studyPlanId:technical.id,name:'CIENCIAS AGRÍCOLAS Y PECUARIAS'}}});
  if(!technicalMention) technicalMention=await db.mention.create({data:{studyPlanId:technical.id,name:'CIENCIAS AGRÍCOLAS Y PECUARIAS',active:true}});

  const year=await db.academicYear.upsert({where:{name:'2026-2027'},update:{},create:{name:'2026-2027',startDate:new Date('2026-10-01'),endDate:new Date('2027-08-31'),enrollmentCloseDate:new Date('2026-10-31T23:59:59'),active:true,contributionAmount:0}});
  await db.gradingPolicy.upsert({where:{academicYearId:year.id},update:{},create:{academicYearId:year.id}});
  for(let n=1;n<=3;n++) await db.pedagogicalLapse.upsert({where:{academicYearId_number:{academicYearId:year.id,number:n}},update:{},create:{academicYearId:year.id,number:n,startDate:new Date(2026,9+(n-1)*3,1),endDate:new Date(2026,11+(n-1)*3,20)}});

  // Las secciones técnicas creadas antes de V2.0.4 se asocian a la mención institucional existente.
  // No se modifica su año, grado, sección, matrícula ni numeración.
  // Normaliza secciones históricas creadas antes de incorporar el catálogo de menciones.
  await db.section.updateMany({
    where:{studyPlanId:general.id,mentionId:null},
    data:{mentionId:generalMention.id,mentionName:generalMention.name}
  });
  await db.section.updateMany({
    where:{studyPlanId:technical.id,mentionId:null},
    data:{mentionId:technicalMention.id,mentionName:technicalMention.name}
  });

  // Conserva como catálogo administrativo los nombres de secciones que ya existan en años anteriores.
  // Si un nombre fue inactivado por el Administrador, el seed no lo reactiva.
  const existingSectionNames=await db.section.findMany({select:{name:true},distinct:['name']});
  for(const row of existingSectionNames){
    const name=row.name.trim().replace(/\s+/g,' ').toLocaleUpperCase('es-VE');
    const catalog=await db.sectionName.findUnique({where:{name}});
    if(!catalog) await db.sectionName.create({data:{name}});
  }

  await db.institution.upsert({
    where:{id:'00000000-0000-0000-0000-000000000001'},
    update:{schoolLogoPath:'/brand/escudo.png',ministryLogoPath:'/brand/ministerio-identidad.png'},
    create:{id:'00000000-0000-0000-0000-000000000001',name:'ET Isaías Medina Angarita',plantCode:'S0955D2016',statisticalCode:'200554',dependencyCode:'18007911070',address:'Configurar dirección institucional',schoolLogoPath:'/brand/escudo.png',ministryLogoPath:'/brand/ministerio-identidad.png'}
  });
  console.log('Seed SIGE-ETIMA completado');
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());
