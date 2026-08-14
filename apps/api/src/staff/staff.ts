import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PartialType } from '@nestjs/swagger';
import {
  AccountType,
  EmploymentCondition,
  HousingTenure,
  IncapacityExecutor,
  Nationality,
  Prisma,
  QualificationType,
  Role,
  Sex,
  StaffType,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/security';

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/u;
const DIGITS_REGEX = /^\d+$/;
const PHONE_REGEX = /^\d{10,15}$/;
const BANK_ACCOUNT_REGEX = /^\d{20}$/;
const CARGO_CODE_REGEX = /^[A-Z0-9]{1,6}$/;
const GARMENT_SIZES = ['10','11','12','13','14','15','16','S','M','L','XL','2XL','3XL'] as const;
const MARITAL_STATUSES = ['SOLTERO', 'CASADO', 'VIUDO', 'DIVORCIADO', 'UNION_ESTABLE'] as const;
const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'] as const;
const CHILD_EDUCATION_LEVELS = [
  'NO_ESTUDIA','EDUCACION_INICIAL',
  '1_GRADO','2_GRADO','3_GRADO','4_GRADO','5_GRADO','6_GRADO',
  '1_ANO_MEDIA_GENERAL','2_ANO_MEDIA_GENERAL','3_ANO_MEDIA_GENERAL','4_ANO_MEDIA_GENERAL','5_ANO_MEDIA_GENERAL',
  '1_ANO_MEDIA_TECNICA','2_ANO_MEDIA_TECNICA','3_ANO_MEDIA_TECNICA','4_ANO_MEDIA_TECNICA','5_ANO_MEDIA_TECNICA','6_ANO_MEDIA_TECNICA',
  'TSU','UNIVERSITARIO_PREGRADO','ESPECIALIZACION','MAESTRIA','DOCTORADO','OTRO',
] as const;
const UPPERCASE_FIELDS = new Set([
  'firstName', 'middleName', 'lastName', 'secondLastName', 'address', 'birthPlace',
  'cargoCode', 'cargoDescription', 'institutionalFunction', 'pantSize', 'shirtSize', 'bankName',
  'housingRepairDescription', 'diseaseDescription', 'surgeryDescription', 'eyeConditionDescription',
  'continuousLeaveDisease', 'retirementProcessObservation', 'administrativeProcessObservation',
]);

export class StaffDto {
  @IsEnum(StaffType) staffType!: StaffType;
  @IsEnum(Nationality) nationality!: Nationality;
  @IsString() @Matches(DIGITS_REGEX, { message: 'La cédula del personal debe contener únicamente números' }) identityNumber!: string;
  @IsOptional() @IsIn(MARITAL_STATUSES) maritalStatus?: string;
  @IsString() @Matches(NAME_REGEX, { message: 'El primer nombre solo puede contener letras' }) firstName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo nombre solo puede contener letras' }) middleName?: string;
  @IsString() @Matches(NAME_REGEX, { message: 'El primer apellido solo puede contener letras' }) lastName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo apellido solo puede contener letras' }) secondLastName?: string;
  @IsString() @IsNotEmpty() address!: string;
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: 'El teléfono debe contener entre 10 y 15 dígitos' }) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(Sex) sex?: Sex;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsIn(BLOOD_TYPES) bloodType?: string;
  @IsOptional() @IsEnum(HousingTenure) housingTenure?: HousingTenure;
  @IsOptional() @IsBoolean() housingRepairNeeded?: boolean;
  @IsOptional() @IsString() housingRepairDescription?: string;
  @IsOptional() @IsBoolean() hasDisease?: boolean;
  @IsOptional() @IsString() diseaseDescription?: string;
  @IsOptional() @IsBoolean() needsSurgery?: boolean;
  @IsOptional() @IsString() surgeryDescription?: string;
  @IsOptional() @IsBoolean() wearsGlasses?: boolean;
  @IsOptional() @IsString() eyeConditionDescription?: string;
  @IsOptional() @IsBoolean() disability?: boolean;
  @IsOptional() @IsBoolean() medicalReport?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(30) childrenCount?: number;
  @IsString() @IsNotEmpty() @Matches(/^[A-Za-z0-9]{1,6}$/, { message: 'El código de cargo debe contener solo letras y números, con un máximo de 6 caracteres' }) cargoCode!: string;
  @IsString() @IsNotEmpty() cargoDescription!: string;
  @IsString() @IsNotEmpty() institutionalFunction!: string;
  @IsOptional() @IsIn(GARMENT_SIZES) pantSize?: string;
  @IsOptional() @IsIn(GARMENT_SIZES) shirtSize?: string;
  @IsOptional() @IsInt() @Min(20) @Max(50) shoeSize?: number;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsEnum(AccountType) accountType?: AccountType;
  @IsOptional() @IsString() @Matches(BANK_ACCOUNT_REGEX, { message: 'El número de cuenta bancaria debe contener exactamente 20 dígitos numéricos' }) accountNumber?: string;
  @IsDateString() ministryEntryDate!: string;
  @IsEnum(EmploymentCondition) employmentCondition!: EmploymentCondition;
  @IsOptional() @IsString() continuousLeaveDisease?: string;
  @IsOptional() @IsInt() @Min(1) @Max(999) continuousLeaveCount?: number;
  @IsOptional() @IsEnum(IncapacityExecutor) incapacityExecutor?: IncapacityExecutor;
  @IsOptional() @IsDateString() incapacityDate?: string;
  @IsOptional() @IsDateString() retirementDate?: string;
  @IsOptional() @IsDateString() retirementProcessDate?: string;
  @IsOptional() @IsString() retirementProcessObservation?: string;
  @IsOptional() @IsDateString() administrativeProcessDate?: string;
  @IsOptional() @IsString() administrativeProcessObservation?: string;
}
export class UpdateStaffDto extends PartialType(StaffDto) {}

export class StaffPositionCatalogDto {
  @IsEnum(StaffType) staffType!: StaffType;
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() description!: string;
}

export class QualificationDto {
  @IsEnum(QualificationType) type!: QualificationType;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() institution?: string;
  @IsOptional() @IsInt() @Min(1900) @Max(2200) year?: number;
}
export class UpdateQualificationDto extends PartialType(QualificationDto) {}

export class StaffChildDto {
  @IsString() @Matches(NAME_REGEX, { message: 'El primer nombre del hijo solo puede contener letras' }) firstName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo nombre del hijo solo puede contener letras' }) middleName?: string;
  @IsString() @Matches(NAME_REGEX, { message: 'El primer apellido del hijo solo puede contener letras' }) lastName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo apellido del hijo solo puede contener letras' }) secondLastName?: string;
  @IsOptional() @IsString() @Matches(DIGITS_REGEX, { message: 'La cédula del hijo debe contener únicamente números' }) identityNumber?: string;
  @IsDateString() birthDate!: string;
  @IsBoolean() studying!: boolean;
  @IsOptional() @IsIn(CHILD_EDUCATION_LEVELS) educationLevel?: string;
  @IsOptional() @IsString() institutionName?: string;
  @IsBoolean() hasDisease!: boolean;
  @IsOptional() @IsString() diseaseDescription?: string;
}
export class UpdateStaffChildDto extends PartialType(StaffChildDto) {}

export class AssignmentDto {
  @IsString() sectionId!: string;
  @IsString() studyPlanSubjectId!: string;
}

@Injectable()
export class StaffService {
  constructor(private db: PrismaService) {}

  private normalize<T extends Record<string, any>>(raw: T) {
    const data: Record<string, any> = { ...raw };
    for (const field of ['birthDate', 'ministryEntryDate', 'incapacityDate', 'retirementDate', 'retirementProcessDate', 'administrativeProcessDate']) {
      if (data[field]) data[field] = new Date(data[field]);
    }
    for (const key of Object.keys(data)) {
      if (typeof data[key] !== 'string') continue;
      let value = String(data[key]).trim();
      if (key === 'email') value = value.toLocaleLowerCase('es-VE');
      if (UPPERCASE_FIELDS.has(key)) value = value.toLocaleUpperCase('es-VE');
      data[key] = value === '' ? null : value;
    }
    return data;
  }

  private validateStaffProfile(data: Record<string, any>, current?: Record<string, any>) {
    const merged = { ...(current || {}), ...data };
    const cargoCode = String(merged.cargoCode || '').trim().toLocaleUpperCase('es-VE');
    if (!cargoCode) throw new BadRequestException('El código de cargo es obligatorio');
    if (!CARGO_CODE_REGEX.test(cargoCode)) throw new BadRequestException('El código de cargo debe contener solo letras y números, con un máximo de 6 caracteres');
    data.cargoCode = cargoCode;
    if (!String(merged.cargoDescription || '').trim()) throw new BadRequestException('La descripción del cargo es obligatoria');
    if (!String(merged.institutionalFunction || '').trim()) throw new BadRequestException('La función dentro de la institución es obligatoria');
    if (!merged.ministryEntryDate) throw new BadRequestException('La fecha de ingreso al MPPE es obligatoria');
    const entryDate = new Date(merged.ministryEntryDate);
    if (Number.isNaN(entryDate.getTime()) || entryDate > new Date()) throw new BadRequestException('La fecha de ingreso al MPPE no puede ser futura');
    if (merged.accountNumber && !BANK_ACCOUNT_REGEX.test(String(merged.accountNumber))) throw new BadRequestException('El número de cuenta bancaria debe contener exactamente 20 dígitos numéricos');
    if (merged.pantSize && !(GARMENT_SIZES as readonly string[]).includes(String(merged.pantSize))) throw new BadRequestException('La talla de pantalón no es válida');
    if (merged.shirtSize && !(GARMENT_SIZES as readonly string[]).includes(String(merged.shirtSize))) throw new BadRequestException('La talla de camisa no es válida');
    if (merged.housingTenure !== HousingTenure.PROPIA) {
      data.housingRepairNeeded = false;
      data.housingRepairDescription = null;
    } else if (merged.housingRepairNeeded && !String(merged.housingRepairDescription || '').trim()) {
      throw new BadRequestException('Describa qué arreglo necesita la vivienda propia');
    } else if (!merged.housingRepairNeeded) {
      data.housingRepairDescription = null;
    }
    if (merged.hasDisease && !String(merged.diseaseDescription || '').trim()) {
      throw new BadRequestException('Describa la enfermedad que padece el personal');
    }
    if (!merged.hasDisease) data.diseaseDescription = null;
    if (merged.needsSurgery && !String(merged.surgeryDescription || '').trim()) {
      throw new BadRequestException('Indique qué operación amerita el personal');
    }
    if (!merged.needsSurgery) data.surgeryDescription = null;
    if (merged.wearsGlasses && !String(merged.eyeConditionDescription || '').trim()) {
      throw new BadRequestException('Describa la condición visual asociada al uso de lentes');
    }
    if (!merged.wearsGlasses) data.eyeConditionDescription = null;

    const condition: EmploymentCondition = merged.employmentCondition || EmploymentCondition.ACTIVO;
    data.employmentCondition = condition;
    const clearConditionFields = (keep: string[]) => {
      const fields = ['continuousLeaveDisease','continuousLeaveCount','incapacityExecutor','incapacityDate','retirementDate','retirementProcessDate','retirementProcessObservation','administrativeProcessDate','administrativeProcessObservation'];
      for (const field of fields) if (!keep.includes(field)) data[field] = null;
    };
    const validPastOrToday = (value: any, label: string) => {
      if (!value) throw new BadRequestException(`${label} es obligatoria`);
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) throw new BadRequestException(`${label} no es válida`);
      const now = new Date(); now.setHours(23,59,59,999);
      if (dt > now) throw new BadRequestException(`${label} no puede ser futura`);
    };
    switch (condition) {
      case EmploymentCondition.ACTIVO:
        clearConditionFields([]);
        break;
      case EmploymentCondition.REPOSO_CONTINUO:
        if (!String(merged.continuousLeaveDisease || '').trim()) throw new BadRequestException('Describa la enfermedad que origina el reposo continuo');
        if (!Number.isInteger(Number(merged.continuousLeaveCount)) || Number(merged.continuousLeaveCount) < 1) throw new BadRequestException('Indique cuántos reposos tiene el trabajador');
        data.continuousLeaveCount = Number(merged.continuousLeaveCount);
        clearConditionFields(['continuousLeaveDisease','continuousLeaveCount']);
        break;
      case EmploymentCondition.INCAPACITADO:
        if (![IncapacityExecutor.IPASME, IncapacityExecutor.IVSS].includes(merged.incapacityExecutor)) throw new BadRequestException('Seleccione el ente ejecutor de la incapacidad: IPASME o IVSS');
        validPastOrToday(merged.incapacityDate, 'La fecha de incapacidad');
        clearConditionFields(['incapacityExecutor','incapacityDate']);
        break;
      case EmploymentCondition.JUBILADO:
        validPastOrToday(merged.retirementDate, 'La fecha de jubilación');
        clearConditionFields(['retirementDate']);
        break;
      case EmploymentCondition.EN_PROCESO_JUBILACION:
        validPastOrToday(merged.retirementProcessDate, 'La fecha de introducción del proceso de jubilación');
        if (!String(merged.retirementProcessObservation || '').trim()) throw new BadRequestException('La observación del proceso de jubilación es obligatoria');
        clearConditionFields(['retirementProcessDate','retirementProcessObservation']);
        break;
      case EmploymentCondition.PROCESO_ADMINISTRATIVO:
        validPastOrToday(merged.administrativeProcessDate, 'La fecha del proceso administrativo');
        if (!String(merged.administrativeProcessObservation || '').trim()) throw new BadRequestException('La observación del proceso administrativo es obligatoria');
        clearConditionFields(['administrativeProcessDate','administrativeProcessObservation']);
        break;
    }
    return data;
  }

  private normalizeChild(raw: Record<string, any>) {
    const data: Record<string, any> = { ...raw };
    if (data.birthDate) data.birthDate = new Date(data.birthDate);
    for (const key of ['firstName','middleName','lastName','secondLastName','institutionName','diseaseDescription']) {
      if (typeof data[key] === 'string') {
        const value = data[key].trim().toLocaleUpperCase('es-VE');
        data[key] = value || null;
      }
    }
    if (typeof data.identityNumber === 'string') data.identityNumber = data.identityNumber.trim() || null;
    return data;
  }

  private validateChild(data: Record<string, any>, current?: Record<string, any>) {
    const merged = { ...(current || {}), ...data };
    if (merged.birthDate) {
      const bd = new Date(merged.birthDate);
      if (Number.isNaN(bd.getTime()) || bd > new Date()) throw new BadRequestException('La fecha de nacimiento del hijo no es válida');
    }
    if (merged.studying) {
      if (!merged.educationLevel || merged.educationLevel === 'NO_ESTUDIA') throw new BadRequestException('Seleccione el nivel educativo actual del hijo');
      if (!String(merged.institutionName || '').trim()) throw new BadRequestException('Indique el nombre de la institución donde estudia el hijo');
    } else {
      data.educationLevel = 'NO_ESTUDIA';
      data.institutionName = null;
    }
    if (merged.hasDisease && !String(merged.diseaseDescription || '').trim()) throw new BadRequestException('Describa la enfermedad que padece el hijo');
    if (!merged.hasDisease) data.diseaseDescription = null;
    return data;
  }

  async syncChildrenCount(staffId: string) {
    const count = await this.db.staffChild.count({ where: { staffId } });
    await this.db.staff.update({ where: { id: staffId }, data: { childrenCount: count } });
    return count;
  }

  listPositionCatalog(staffType?: StaffType, active?: boolean) {
    return this.db.staffPositionCatalog.findMany({
      where: { ...(staffType ? { staffType } : {}), ...(active === undefined ? {} : { active }) },
      orderBy: [{ staffType: 'asc' }, { code: 'asc' }, { description: 'asc' }],
    });
  }

  async createPositionCatalog(d: StaffPositionCatalogDto) {
    const code = d.code.trim().toLocaleUpperCase('es-VE');
    const description = d.description.trim().toLocaleUpperCase('es-VE');
    if (!code || !description) throw new BadRequestException('Código y descripción del cargo son obligatorios');
    try {
      return await this.db.staffPositionCatalog.create({ data: { staffType: d.staffType, code, description } });
    } catch (error:any) {
      if (error?.code === 'P2002') throw new ConflictException('Ese código de cargo ya existe para este tipo de personal');
      throw error;
    }
  }

  async setPositionCatalogActive(id: string, active: boolean) {
    return this.db.staffPositionCatalog.update({ where: { id }, data: { active } });
  }

  list(search?: string, active?: boolean, staffType?: StaffType) {
    const term = search?.trim();
    const digits = term?.replace(/\D/g, '');
    return this.db.staff.findMany({
      where: {
        ...(active === undefined ? {} : { active }),
        ...(staffType ? { staffType } : {}),
        ...(term ? { OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { cargoDescription: { contains: term, mode: 'insensitive' } },
          { institutionalFunction: { contains: term, mode: 'insensitive' } },
          ...(digits ? [{ identityNumber: { contains: digits } }] : []),
        ] } : {}),
      },
      include: {
        qualifications: { orderBy: [{ type: 'asc' }, { year: 'desc' }] },
        _count: { select: { assignments: true, children: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  get(id: string) {
    return this.db.staff.findUniqueOrThrow({
      where: { id },
      include: {
        qualifications: { orderBy: [{ type: 'asc' }, { year: 'desc' }] },
        children: { orderBy: [{ birthDate: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }] },
        assignments: {
          include: {
            section: { include: { academicYear: true, studyPlan: true } },
            studyPlanSubject: { include: { subject: true } },
            _count: { select: { assessments: true, lapseGrades: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        user: { select: { id: true, email: true, role: true, active: true, lastLoginAt: true } },
      },
    });
  }

  async create(d: StaffDto) {
    try {
      return await this.db.staff.create({
        data: this.validateStaffProfile(this.normalize(d)) as Prisma.StaffUncheckedCreateInput,
        include: { qualifications: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Ya existe una persona registrada con esa cédula');
      throw error;
    }
  }

  async update(id: string, d: UpdateStaffDto) {
    try {
      const current = await this.db.staff.findUniqueOrThrow({ where: { id } });
      const normalized = this.normalize(d);
      return await this.db.staff.update({
        where: { id },
        data: this.validateStaffProfile(normalized, current as any) as Prisma.StaffUncheckedUpdateInput,
        include: { qualifications: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Ya existe una persona registrada con esa cédula');
      throw error;
    }
  }

  async setActive(id: string, active: boolean) {
    return this.db.$transaction(async (tx) => {
      const staff = await tx.staff.update({ where: { id }, data: { active } });
      if (!active) await tx.teacherAssignment.updateMany({ where: { staffId: id, active: true }, data: { active: false } });
      return staff;
    });
  }

  async addQualification(staffId: string, d: QualificationDto) {
    await this.db.staff.findUniqueOrThrow({ where: { id: staffId } });
    return this.db.staffQualification.create({
      data: {
        staffId,
        type: d.type,
        title: d.title.trim().toLocaleUpperCase('es-VE'),
        institution: d.institution?.trim().toLocaleUpperCase('es-VE') || null,
        year: d.year,
      },
    });
  }

  async updateQualification(staffId: string, id: string, d: UpdateQualificationDto) {
    const row = await this.db.staffQualification.findUniqueOrThrow({ where: { id } });
    if (row.staffId !== staffId) throw new BadRequestException('El título no pertenece a esta persona');
    return this.db.staffQualification.update({
      where: { id },
      data: {
        type: d.type,
        title: d.title === undefined ? undefined : d.title.trim().toLocaleUpperCase('es-VE'),
        institution: d.institution === undefined ? undefined : (d.institution.trim().toLocaleUpperCase('es-VE') || null),
        year: d.year,
      },
    });
  }

  async deleteQualification(staffId: string, id: string) {
    const row = await this.db.staffQualification.findUniqueOrThrow({ where: { id } });
    if (row.staffId !== staffId) throw new BadRequestException('El título no pertenece a esta persona');
    return this.db.staffQualification.delete({ where: { id } });
  }

  async addChild(staffId: string, d: StaffChildDto) {
    await this.db.staff.findUniqueOrThrow({ where: { id: staffId } });
    const data = this.validateChild(this.normalizeChild(d));
    const row = await this.db.staffChild.create({
      data: { ...data, staffId } as Prisma.StaffChildUncheckedCreateInput,
    });
    await this.syncChildrenCount(staffId);
    return row;
  }

  async updateChild(staffId: string, id: string, d: UpdateStaffChildDto) {
    const row = await this.db.staffChild.findUniqueOrThrow({ where: { id } });
    if (row.staffId !== staffId) throw new BadRequestException('El hijo no pertenece a esta persona');
    const data = this.validateChild(this.normalizeChild(d), row as any);
    const updated = await this.db.staffChild.update({ where: { id }, data: data as Prisma.StaffChildUncheckedUpdateInput });
    await this.syncChildrenCount(staffId);
    return updated;
  }

  async deleteChild(staffId: string, id: string) {
    const row = await this.db.staffChild.findUniqueOrThrow({ where: { id } });
    if (row.staffId !== staffId) throw new BadRequestException('El hijo no pertenece a esta persona');
    const deleted = await this.db.staffChild.delete({ where: { id } });
    await this.syncChildrenCount(staffId);
    return deleted;
  }

  async assignTeacher(staffId: string, d: AssignmentDto) {
    const staff = await this.db.staff.findUniqueOrThrow({ where: { id: staffId } });
    if (!staff.active) throw new BadRequestException('El personal está inactivo');
    if (staff.staffType !== StaffType.DOCENTE) throw new BadRequestException('Solo el personal clasificado como DOCENTE puede recibir asignaciones académicas');

    const [section, subject] = await Promise.all([
      this.db.section.findUnique({ where: { id: d.sectionId }, include: { academicYear: true, studyPlan: true } }),
      this.db.studyPlanSubject.findUnique({ where: { id: d.studyPlanSubjectId }, include: { subject: true } }),
    ]);
    if (!section) throw new BadRequestException('La sección seleccionada no existe');
    if (!subject?.active) throw new BadRequestException('La materia seleccionada no existe o está inactiva');
    if (subject.studyPlanId !== section.studyPlanId || subject.gradeLevel !== section.gradeLevel) {
      throw new BadRequestException('La materia no corresponde al plan y grado de la sección seleccionada');
    }
    if (section.academicYear.academicClosedAt) throw new BadRequestException('No se pueden crear asignaciones en un año escolar finalizado');

    return this.db.teacherAssignment.upsert({
      where: { staffId_sectionId_studyPlanSubjectId: { staffId, sectionId: d.sectionId, studyPlanSubjectId: d.studyPlanSubjectId } },
      update: { active: true },
      create: { staffId, sectionId: d.sectionId, studyPlanSubjectId: d.studyPlanSubjectId, active: true },
      include: { section: { include: { academicYear: true, studyPlan: true } }, studyPlanSubject: { include: { subject: true } } },
    });
  }

  async setAssignmentActive(staffId: string, assignmentId: string, active: boolean) {
    const row = await this.db.teacherAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
    if (row.staffId !== staffId) throw new BadRequestException('La asignación no pertenece a este docente');
    return this.db.teacherAssignment.update({ where: { id: assignmentId }, data: { active } });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private s: StaffService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Get()
  list(@Query('search') search?: string, @Query('active') active?: string, @Query('type') type?: StaffType) {
    return this.s.list(search, active === undefined ? undefined : active === 'true', type);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Get('position-catalog/list')
  positionCatalog(@Query('type') type?: StaffType, @Query('active') active?: string) {
    return this.s.listPositionCatalog(type, active === undefined ? undefined : active === 'true');
  }

  @Roles(Role.ADMIN)
  @Post('position-catalog')
  positionCatalogCreate(@Body() d: StaffPositionCatalogDto) { return this.s.createPositionCatalog(d); }

  @Roles(Role.ADMIN)
  @Patch('position-catalog/:positionId/active')
  positionCatalogActive(@Param('positionId') id: string, @Body('active') active: boolean) { return this.s.setPositionCatalogActive(id, !!active); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Get(':id') get(@Param('id') id: string) { return this.s.get(id); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post() create(@Body() d: StaffDto) { return this.s.create(d); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Patch(':id') update(@Param('id') id: string, @Body() d: UpdateStaffDto) { return this.s.update(id, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch(':id/active') active(@Param('id') id: string, @Body('active') active: boolean) { return this.s.setActive(id, !!active); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/qualifications') qualification(@Param('id') id: string, @Body() d: QualificationDto) { return this.s.addQualification(id, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Patch(':id/qualifications/:qualificationId') qualificationUpdate(@Param('id') id: string, @Param('qualificationId') qid: string, @Body() d: UpdateQualificationDto) { return this.s.updateQualification(id, qid, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Delete(':id/qualifications/:qualificationId') qualificationDelete(@Param('id') id: string, @Param('qualificationId') qid: string) { return this.s.deleteQualification(id, qid); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/children') child(@Param('id') id: string, @Body() d: StaffChildDto) { return this.s.addChild(id, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Patch(':id/children/:childId') childUpdate(@Param('id') id: string, @Param('childId') childId: string, @Body() d: UpdateStaffChildDto) { return this.s.updateChild(id, childId, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Delete(':id/children/:childId') childDelete(@Param('id') id: string, @Param('childId') childId: string) { return this.s.deleteChild(id, childId); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post(':id/assignments') assignment(@Param('id') id: string, @Body() d: AssignmentDto) { return this.s.assignTeacher(id, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch(':id/assignments/:assignmentId/active') assignmentActive(@Param('id') id: string, @Param('assignmentId') aid: string, @Body('active') active: boolean) { return this.s.setAssignmentActive(id, aid, !!active); }
}
