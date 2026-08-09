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
import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
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
  DocumentType,
  LivingWith,
  MaritalStatus,
  Nationality,
  Prisma,
  Role,
  Sex,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/security';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GARMENT_SIZES = ['10', '11', '12', '13', '14', '15', '16', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/u;
const DIGITS_REGEX = /^\d+$/;
const PHONE_REGEX = /^\d{10,15}$/;

export class CreateStudentDto {
  @IsEnum(Nationality) nationality!: Nationality;
  @IsString() @Matches(DIGITS_REGEX, { message: 'La cédula debe contener únicamente números' }) identityNumber!: string;
  @IsOptional() @IsString() schoolIdentityNumber?: string;
  @IsString() @Matches(NAME_REGEX, { message: 'El primer nombre solo puede contener letras' }) firstName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo nombre solo puede contener letras' }) middleName?: string;
  @IsString() @Matches(NAME_REGEX, { message: 'El primer apellido solo puede contener letras' }) lastName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo apellido solo puede contener letras' }) secondLastName?: string;
  @IsEnum(Sex) sex!: Sex;
  @IsOptional() @IsEnum(MaritalStatus) maritalStatus?: MaritalStatus;
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: 'El teléfono debe contener entre 10 y 15 dígitos' }) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() birthPlace!: string;
  @IsString() birthStateId!: string;
  @IsString() birthMunicipalityId!: string;
  @IsString() birthParishId!: string;
  @IsDateString() birthDate!: string;
  @IsString() address!: string;
  @IsString() residenceStateId!: string;
  @IsString() residenceMunicipalityId!: string;
  @IsString() residenceParishId!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El nombre de la madre solo puede contener letras' }) motherName?: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El nombre del padre solo puede contener letras' }) fatherName?: string;
  @IsOptional() @IsString() @Matches(DIGITS_REGEX, { message: 'La cédula de la madre debe contener únicamente números' }) motherIdentity?: string;
  @IsOptional() @IsString() @Matches(DIGITS_REGEX, { message: 'La cédula del padre debe contener únicamente números' }) fatherIdentity?: string;
  @IsOptional() @IsString() motherAddress?: string;
  @IsOptional() @IsString() fatherAddress?: string;
  @IsEnum(LivingWith) livingWith!: LivingWith;
  @IsOptional() @IsIn(BLOOD_TYPES) bloodType?: string;
  @IsOptional() @IsBoolean() disability?: boolean;
  @IsOptional() @IsString() disabilityDetails?: string;
  @IsOptional() @IsBoolean() medicalReport?: boolean;
  @IsOptional() @IsBoolean() allergy?: boolean;
  @IsOptional() @IsString() allergyDetails?: string;
  @IsOptional() @IsString() originSchool?: string;
  @IsOptional() @IsString() destinationSchool?: string;
  @IsOptional() @IsString() observations?: string;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

export class AnthropometricDto {
  @IsInt() @Min(50) @Max(250) heightCm!: number;
  @IsInt() @Min(10000) @Max(300000) weightGrams!: number;
  @IsOptional() @IsIn(GARMENT_SIZES) shirtSize?: string;
  @IsOptional() @IsIn(GARMENT_SIZES) pantSize?: string;
  @IsOptional() @IsInt() @Min(20) @Max(46) shoeSize?: number;
  @IsOptional() @IsString() enrollmentId?: string;
  @IsOptional() @IsDateString() measuredAt?: string;
}

export class EmergencyContactDto {
  @IsString() @Matches(NAME_REGEX, { message: 'El primer nombre del contacto solo puede contener letras' }) firstName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo nombre del contacto solo puede contener letras' }) middleName?: string;
  @IsString() @Matches(NAME_REGEX, { message: 'El primer apellido del contacto solo puede contener letras' }) lastName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo apellido del contacto solo puede contener letras' }) secondLastName?: string;
  @IsOptional() @IsString() @Matches(DIGITS_REGEX, { message: 'La cédula del contacto debe contener únicamente números' }) identityNumber?: string;
  @IsString() @Matches(PHONE_REGEX, { message: 'El teléfono del contacto debe contener entre 10 y 15 dígitos' }) phone!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

export class StudentDocumentDto {
  @IsEnum(DocumentType) type!: DocumentType;
  @IsOptional() @IsString() academicYearId?: string;
  @IsBoolean() presented!: boolean;
  @IsOptional() @IsString() filePath?: string;
  @IsOptional() @IsString() originalName?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() @Min(0) sizeBytes?: number;
  @IsOptional() @IsString() notes?: string;
}

const studentInclude = {
  birthState: true,
  birthMunicipality: true,
  birthParish: true,
  residenceState: true,
  residenceMunicipality: true,
  residenceParish: true,
  enrollments: {
    include: { academicYear: true, section: true, studyPlan: true, withdrawal: true },
    orderBy: { registrationDate: 'desc' as const },
  },
  representatives: { include: { representative: true } },
  emergencyContacts: { orderBy: { lastName: 'asc' as const } },
  anthropometrics: { orderBy: { measuredAt: 'desc' as const } },
  documents: { orderBy: { updatedAt: 'desc' as const } },
} satisfies Prisma.StudentInclude;

const STUDENT_UPPERCASE_FIELDS = new Set([
  'schoolIdentityNumber', 'firstName', 'middleName', 'lastName', 'secondLastName', 'birthPlace', 'address',
  'motherName', 'fatherName', 'motherAddress', 'fatherAddress', 'disabilityDetails', 'allergyDetails',
  'originSchool', 'destinationSchool', 'observations',
]);

const EMERGENCY_UPPERCASE_FIELDS = new Set([
  'firstName', 'middleName', 'lastName', 'secondLastName', 'address', 'notes',
]);

@Injectable()
export class StudentsService {
  constructor(private db: PrismaService) {}

  list(search?: string, active?: boolean) {
    const term = search?.trim();
    const numericTerm = term?.replace(/^[VEve][-\s]?/, '').replace(/\D/g, '');
    return this.db.student.findMany({
      where: {
        ...(active === undefined ? {} : { active }),
        ...(term
          ? {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { middleName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { secondLastName: { contains: term, mode: 'insensitive' } },
                ...(numericTerm ? [{ identityNumber: { contains: numericTerm } }] : []),
                { schoolIdentityNumber: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        enrollments: {
          take: 1,
          orderBy: { registrationDate: 'desc' },
          include: { academicYear: true, section: true, studyPlan: true },
        },
        representatives: { include: { representative: true } },
      },
    });
  }

  get(id: string) {
    return this.db.student.findUniqueOrThrow({ where: { id }, include: studentInclude });
  }

  private async validateGeography(dto: Partial<CreateStudentDto>) {
    const pairs = [
      [dto.birthStateId, dto.birthMunicipalityId, dto.birthParishId, 'nacimiento'],
      [dto.residenceStateId, dto.residenceMunicipalityId, dto.residenceParishId, 'residencia'],
    ] as const;

    for (const [stateId, municipalityId, parishId, label] of pairs) {
      if (municipalityId) {
        const municipality = await this.db.municipality.findUnique({ where: { id: municipalityId } });
        if (!municipality || !stateId || municipality.stateId !== stateId) {
          throw new BadRequestException(`Municipio de ${label} incompatible con el estado seleccionado`);
        }
      }
      if (parishId) {
        const parish = await this.db.parish.findUnique({ where: { id: parishId } });
        if (!parish || !municipalityId || parish.municipalityId !== municipalityId) {
          throw new BadRequestException(`Parroquia de ${label} incompatible con el municipio seleccionado`);
        }
      }
    }
  }

  private normalizeStudentData(dto: Partial<CreateStudentDto>) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'string') {
        let value = String(data[key]).trim();
        if (key === 'email') value = value.toLocaleLowerCase('es-VE');
        if (STUDENT_UPPERCASE_FIELDS.has(key)) value = value.toLocaleUpperCase('es-VE');
        data[key] = value === '' ? null : value;
      }
    }
    return data;
  }

  private normalizeEmergencyData(dto: EmergencyContactDto) {
    const data: Record<string, unknown> = { ...dto };
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'string') {
        let value = String(data[key]).trim();
        if (EMERGENCY_UPPERCASE_FIELDS.has(key)) value = value.toLocaleUpperCase('es-VE');
        data[key] = value === '' ? null : value;
      }
    }
    return data;
  }

  async create(dto: CreateStudentDto) {
    await this.validateGeography(dto);
    try {
      return await this.db.student.create({ data: this.normalizeStudentData(dto) as Prisma.StudentUncheckedCreateInput });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Ya existe un estudiante con esa cédula o cédula escolar');
      throw error;
    }
  }

  async update(id: string, dto: UpdateStudentDto) {
    const current = await this.db.student.findUniqueOrThrow({ where: { id } });
    await this.validateGeography({
      birthStateId: dto.birthStateId ?? current.birthStateId ?? undefined,
      birthMunicipalityId: dto.birthMunicipalityId ?? current.birthMunicipalityId ?? undefined,
      birthParishId: dto.birthParishId ?? current.birthParishId ?? undefined,
      residenceStateId: dto.residenceStateId ?? current.residenceStateId ?? undefined,
      residenceMunicipalityId: dto.residenceMunicipalityId ?? current.residenceMunicipalityId ?? undefined,
      residenceParishId: dto.residenceParishId ?? current.residenceParishId ?? undefined,
    });
    try {
      return await this.db.student.update({
        where: { id },
        data: this.normalizeStudentData(dto) as Prisma.StudentUncheckedUpdateInput,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Ya existe un estudiante con esa cédula o cédula escolar');
      throw error;
    }
  }

  setActive(id: string, active: boolean) {
    return this.db.student.update({ where: { id }, data: { active } });
  }

  addAnthropometric(id: string, dto: AnthropometricDto) {
    const { measuredAt, ...rest } = dto;
    return this.db.anthropometricRecord.create({
      data: { studentId: id, ...rest, measuredAt: measuredAt ? new Date(measuredAt) : undefined },
    });
  }

  addEmergencyContact(id: string, dto: EmergencyContactDto) {
    return this.db.emergencyContact.create({
      data: { studentId: id, ...this.normalizeEmergencyData(dto) } as Prisma.EmergencyContactUncheckedCreateInput,
    });
  }

  updateEmergencyContact(id: string, contactId: string, dto: EmergencyContactDto) {
    return this.db.emergencyContact.updateMany({
      where: { id: contactId, studentId: id },
      data: this.normalizeEmergencyData(dto) as Prisma.EmergencyContactUncheckedUpdateInput,
    });
  }

  removeEmergencyContact(id: string, contactId: string) {
    return this.db.emergencyContact.deleteMany({ where: { id: contactId, studentId: id } });
  }

  async upsertDocument(id: string, dto: StudentDocumentDto) {
    const existing = await this.db.studentDocument.findFirst({
      where: { studentId: id, academicYearId: dto.academicYearId ?? null, type: dto.type },
    });
    const data = {
      ...dto,
      notes: dto.notes?.trim().toLocaleUpperCase('es-VE') || undefined,
      academicYearId: dto.academicYearId || null,
      uploadedAt: dto.filePath ? new Date() : undefined,
    };
    return existing
      ? this.db.studentDocument.update({ where: { id: existing.id }, data })
      : this.db.studentDocument.create({ data: { studentId: id, ...data } });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private s: StudentsService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Get()
  list(@Query('search') search?: string, @Query('active') active?: string) {
    return this.s.list(search, active === undefined ? undefined : active === 'true');
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.s.get(id);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.s.create(dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.s.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Patch(':id/active')
  active(@Param('id') id: string, @Body('active') active: boolean) {
    return this.s.setActive(id, !!active);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/anthropometrics')
  anthro(@Param('id') id: string, @Body() dto: AnthropometricDto) {
    return this.s.addAnthropometric(id, dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/emergency-contacts')
  emergency(@Param('id') id: string, @Body() dto: EmergencyContactDto) {
    return this.s.addEmergencyContact(id, dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Patch(':id/emergency-contacts/:contactId')
  emergencyUpdate(@Param('id') id: string, @Param('contactId') contactId: string, @Body() dto: EmergencyContactDto) {
    return this.s.updateEmergencyContact(id, contactId, dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/emergency-contacts/:contactId/remove')
  emergencyRemove(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.s.removeEmergencyContact(id, contactId);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/documents')
  document(@Param('id') id: string, @Body() dto: StudentDocumentDto) {
    return this.s.upsertDocument(id, dto);
  }
}
