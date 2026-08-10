export type CatalogModality = 'MEDIA_GENERAL' | 'MEDIA_TECNICA';

export type OfficialPlanTemplate = {
  code: string;
  modality: CatalogModality;
  specialtyName?: string;
  optionName: string;
  hasMention: boolean;
  mentionName?: string;
  titleName: string;
  maxGrade: 5 | 6;
  sourceReference: string;
};

const GENERAL_31059_SOURCE = 'GACETA OFICIAL N.º 41.221 · 24/08/2017';
const GENERAL_31060_SOURCE = 'GACETA OFICIAL N.º 42.738 · 19/10/2023';
const TECHNICAL_SOURCE = 'GACETA OFICIAL N.º 42.739 · RESOLUCIÓN DM/N.º 0018 · 20/10/2023';
const TECHNICAL_RECTIFIED_SOURCE = 'GACETA OFICIAL N.º 42.739 · RESOLUCIÓN DM/N.º 0018 · 20/10/2023 · CÓDIGOS RECTIFICADOS POR MEMORANDO CIRCULAR MPPE-DGRCA N.º 000599/24';

function technical(code: string, specialtyName: string, optionName: string): OfficialPlanTemplate {
  return {
    code,
    modality: 'MEDIA_TECNICA',
    specialtyName,
    optionName,
    hasMention: true,
    mentionName: optionName,
    titleName: `TÉCNICO PROFESIONAL EN ${specialtyName} · ${optionName}`,
    maxGrade: 6,
    sourceReference: ['INDUSTRIAL','SALUD','ECONOMÍA SOCIAL'].includes(specialtyName) ? TECHNICAL_RECTIFIED_SOURCE : TECHNICAL_SOURCE,
  };
}

export const OFFICIAL_STUDY_PLAN_CATALOG: OfficialPlanTemplate[] = [
  {
    code: '31059',
    modality: 'MEDIA_GENERAL',
    optionName: 'BACHILLER',
    hasMention: false,
    titleName: 'BACHILLER',
    maxGrade: 5,
    sourceReference: GENERAL_31059_SOURCE,
  },
  {
    code: '31060',
    modality: 'MEDIA_GENERAL',
    optionName: 'CIENCIA Y TECNOLOGÍA',
    hasMention: true,
    mentionName: 'CIENCIA Y TECNOLOGÍA',
    titleName: 'BACHILLER EN MENCIÓN CIENCIA Y TECNOLOGÍA',
    maxGrade: 5,
    sourceReference: GENERAL_31060_SOURCE,
  },

  technical('41048', 'AGROPECUARIA', 'ECOTURISMO'),
  technical('41049', 'AGROPECUARIA', 'CIENCIAS AGRÍCOLAS Y PECUARIAS'),
  technical('41050', 'AGROPECUARIA', 'FORESTAL'),
  technical('41051', 'AGROPECUARIA', 'PESCA Y ACUICULTURA'),
  technical('41052', 'AGROPECUARIA', 'TECNOLOGÍA DE LOS ALIMENTOS'),
  technical('41053', 'AGROPECUARIA', 'PROMOCIÓN Y GESTIÓN AMBIENTAL'),
  technical('41054', 'AGROPECUARIA', 'CIENCIAS AGRÍCOLAS, OPCIÓN ALGODÓN'),
  technical('41055', 'AGROPECUARIA', 'CIENCIAS AGRÍCOLAS, OPCIÓN ARROZ'),
  technical('41056', 'AGROPECUARIA', 'CIENCIAS AGRÍCOLAS, OPCIÓN CACAO'),
  technical('41057', 'AGROPECUARIA', 'CIENCIAS AGRÍCOLAS, OPCIÓN CAFÉ'),
  technical('41058', 'AGROPECUARIA', 'CIENCIAS AGRÍCOLAS, OPCIÓN SOYA'),

  technical('42000', 'HIDROCARBUROS', 'PETRÓLEO Y GAS NATURAL'),
  technical('42001', 'HIDROCARBUROS', 'REFINACIÓN Y PETROQUÍMICA'),

  technical('43290', 'INDUSTRIAL', 'ELECTRICIDAD'),
  technical('43291', 'INDUSTRIAL', 'ELECTRÓNICA'),
  technical('43292', 'INDUSTRIAL', 'CONSTRUCCIÓN CIVIL'),
  technical('43293', 'INDUSTRIAL', 'MECÁNICA TÉRMICA'),
  technical('43294', 'INDUSTRIAL', 'MECATRÓNICA'),
  technical('43295', 'INDUSTRIAL', 'METALMECÁNICA'),
  technical('43296', 'INDUSTRIAL', 'MINERÍA'),
  technical('43297', 'INDUSTRIAL', 'QUÍMICA INDUSTRIAL'),
  technical('43298', 'INDUSTRIAL', 'TELEMÁTICA'),

  technical('44000', 'TRANSPORTE MULTIMODAL', 'TRANSPORTE ACUÁTICO'),
  technical('44001', 'TRANSPORTE MULTIMODAL', 'TRANSPORTE TERRESTRE'),
  technical('44002', 'TRANSPORTE MULTIMODAL', 'TRANSPORTE FERROVIARIO Y SISTEMAS POR CABLE'),
  technical('44003', 'TRANSPORTE MULTIMODAL', 'AERONÁUTICA, OPCIÓN MANTENIMIENTO AERONÁUTICO'),
  technical('44004', 'TRANSPORTE MULTIMODAL', 'AERONÁUTICA, OPCIÓN SERVICIOS AÉREOS'),

  technical('45040', 'SALUD', 'ELECTROMEDICINA'),
  technical('45041', 'SALUD', 'ENFERMERÍA'),
  technical('45042', 'SALUD', 'SALUD Y RECREACIÓN'),
  technical('45043', 'SALUD', 'FARMACIA'),
  technical('45044', 'SALUD', 'HIGIENE DENTAL'),
  technical('45045', 'SALUD', 'LABORATORIO CLÍNICO'),
  technical('45046', 'SALUD', 'NUTRICIÓN Y DIETÉTICA'),
  technical('45047', 'SALUD', 'ÓRTESIS Y PRÓTESIS'),
  technical('45048', 'SALUD', 'OPTOMETRÍA'),
  technical('45049', 'SALUD', 'REGISTRO Y ESTADÍSTICA DE SALUD'),

  technical('46067', 'ECONOMÍA SOCIAL', 'ADMINISTRACIÓN'),
  technical('46068', 'ECONOMÍA SOCIAL', 'ADUANA'),
  technical('46069', 'ECONOMÍA SOCIAL', 'ECONOMÍA DIGITAL'),
  technical('46070', 'ECONOMÍA SOCIAL', 'CONTABILIDAD'),
  technical('46071', 'ECONOMÍA SOCIAL', 'TURISMO'),

  technical('47000', 'PREVENCIÓN CIUDADANA', 'GESTIÓN INTEGRAL DE RIESGO'),

  technical('48069', 'ARTE', 'ARTES AUDIOVISUALES'),
  technical('48070', 'ARTE', 'ARTES ESCÉNICAS'),
  technical('48071', 'ARTE', 'ARTES MUSICALES'),
  technical('48072', 'ARTE', 'ARTES VISUALES'),

  technical('49000', 'EDUCACIÓN FÍSICA', 'PROMOCIÓN DEL ENTRENAMIENTO DEPORTIVO'),
  technical('49001', 'EDUCACIÓN FÍSICA', 'PROMOCIÓN DE LA ACTIVIDAD FÍSICA Y RECREACIÓN'),
];

export const OFFICIAL_PLAN_BY_CODE = new Map(OFFICIAL_STUDY_PLAN_CATALOG.map((plan) => [plan.code, plan]));

export type CurriculumRow = {
  suffix: string;
  name: string;
  hours: Array<number | null>;
  component?: string;
  gradingType?: 'NUMERIC' | 'ORIENTATION_LETTER';
  annualHoursAtSixth?: number;
};

export const GENERAL_31059_CURRICULUM: CurriculumRow[] = [
  { suffix: 'CAS', name: 'CASTELLANO', hours: [4,4,4,4,4] },
  { suffix: 'ING', name: 'INGLÉS Y OTRAS LENGUAS EXTRANJERAS', hours: [6,6,6,4,4] },
  { suffix: 'MAT', name: 'MATEMÁTICAS', hours: [4,4,4,4,4] },
  { suffix: 'EFI', name: 'EDUCACIÓN FÍSICA', hours: [6,6,6,6,6] },
  { suffix: 'ART', name: 'ARTE Y PATRIMONIO', hours: [4,4,null,null,null] },
  { suffix: 'CNA', name: 'CIENCIAS NATURALES', hours: [6,6,null,null,null] },
  { suffix: 'FIS', name: 'FÍSICA', hours: [null,null,4,4,4] },
  { suffix: 'QUI', name: 'QUÍMICA', hours: [null,null,4,4,4] },
  { suffix: 'BIO', name: 'BIOLOGÍA', hours: [null,null,4,4,4] },
  { suffix: 'CTI', name: 'CIENCIAS DE LA TIERRA', hours: [null,null,null,null,2] },
  { suffix: 'GHC', name: 'GEOGRAFÍA, HISTORIA Y CIUDADANÍA', hours: [6,6,6,4,4] },
  { suffix: 'FSN', name: 'FORMACIÓN PARA LA SOBERANÍA NACIONAL', hours: [null,null,null,2,2] },
  { suffix: 'ORI', name: 'ORIENTACIÓN Y CONVIVENCIA', hours: [2,2,2,2,2], gradingType: 'ORIENTATION_LETTER' },
  { suffix: 'GRP', name: 'PARTICIPACIÓN EN LOS GRUPOS DE CREACIÓN, RECREACIÓN Y PRODUCCIÓN', hours: [6,6,6,6,6] },
];

export const GENERAL_31060_CURRICULUM: CurriculumRow[] = [
  { suffix: 'LYL', name: 'LENGUA Y LITERATURA', hours: [4,4,4,4,4], component: 'FORMACIÓN GENERAL' },
  { suffix: 'IDI', name: 'IDIOMAS', hours: [4,4,4,4,4], component: 'FORMACIÓN GENERAL' },
  { suffix: 'MAT', name: 'MATEMÁTICA', hours: [4,4,4,4,4], component: 'FORMACIÓN GENERAL' },
  { suffix: 'EFI', name: 'EDUCACIÓN FÍSICA', hours: [4,4,4,4,4], component: 'FORMACIÓN GENERAL' },
  { suffix: 'BAT', name: 'BIOLOGÍA, AMBIENTE Y TECNOLOGÍA', hours: [4,4,4,4,4], component: 'FORMACIÓN GENERAL' },
  { suffix: 'FIS', name: 'FÍSICA', hours: [2,2,4,4,4], component: 'FORMACIÓN GENERAL' },
  { suffix: 'QUI', name: 'QUÍMICA', hours: [2,2,4,4,4], component: 'FORMACIÓN GENERAL' },
  { suffix: 'GHS', name: 'GEOGRAFÍA, HISTORIA Y SOBERANÍA NACIONAL', hours: [6,6,4,4,4], component: 'FORMACIÓN GENERAL' },
  { suffix: 'OVO', name: 'ORIENTACIÓN VOCACIONAL', hours: [4,4,2,2,2], component: 'FORMACIÓN GENERAL' },
  { suffix: 'ITP', name: 'INNOVACIÓN TECNOLÓGICA Y PRODUCTIVA', hours: [6,6,6,6,6], component: 'FORMACIÓN CIENTÍFICA, TECNOLÓGICA Y PRODUCTIVA' },
];

export function technicalCurriculum(optionName: string): CurriculumRow[] {
  return [
    { suffix: 'LYL', name: 'LENGUA Y LITERATURA', hours: [3,3,4,4,4,null], component: 'FORMACIÓN GENERAL' },
    { suffix: 'MAT', name: 'MATEMÁTICA', hours: [4,4,4,4,4,null], component: 'FORMACIÓN GENERAL' },
    { suffix: 'IDI', name: 'IDIOMAS', hours: [3,3,4,4,4,null], component: 'FORMACIÓN GENERAL' },
    { suffix: 'EFI', name: 'EDUCACIÓN FÍSICA', hours: [2,2,2,null,null,null], component: 'FORMACIÓN GENERAL' },
    { suffix: 'BAT', name: 'BIOLOGÍA, AMBIENTE Y TECNOLOGÍA', hours: [4,4,8,8,8,null], component: 'FORMACIÓN GENERAL' },
    { suffix: 'GHS', name: 'GEOGRAFÍA, HISTORIA Y SOBERANÍA NACIONAL', hours: [4,4,2,2,2,null], component: 'FORMACIÓN GENERAL' },
    { suffix: 'PES', name: 'PROYECTO DE ECONOMÍA SOCIOPRODUCTIVA Y TECNOLOGÍA (COMÚN A TODAS LAS ESPECIALIDADES Y MENCIONES)', hours: [8,8,8,8,8,null], component: 'FORMACIÓN CIENTÍFICA, TECNOLÓGICA Y PRODUCTIVA' },
    { suffix: 'AFM', name: optionName === 'CIENCIAS AGRÍCOLAS Y PECUARIAS' ? 'ÁREA DE FORMACIÓN RELACIONADA CON LA MENCIÓN' : `ÁREA TÉCNICA DE LA MENCIÓN U OPCIÓN: ${optionName}`, hours: [8,8,8,10,10,null], component: 'FORMACIÓN CIENTÍFICA, TECNOLÓGICA Y PRODUCTIVA' },
    { suffix: 'OVS', name: 'ORIENTACIÓN Y VINCULACIÓN SOCIOLABORAL', hours: [4,4,2,2,2,null], component: 'PRÁCTICA VOCACIONAL Y PROFESIONAL' },
    { suffix: 'PRA', name: 'PRÁCTICA PROFESIONAL', hours: [null,null,null,null,null,null], component: 'PRÁCTICA VOCACIONAL Y PROFESIONAL', annualHoursAtSixth: 1440 },
  ];
}
