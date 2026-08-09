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
import { AccountType, Nationality, Prisma, RelationshipType, Role, Sex } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/security';

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/u;
const DIGITS_REGEX = /^\d+$/;
const PHONE_REGEX = /^\d{10,15}$/;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const UPPERCASE_FIELDS = new Set([
  'firstName', 'middleName', 'lastName', 'secondLastName', 'profession', 'address', 'birthPlace',
  'workplace', 'workAddress', 'bankName',
]);

export class RepresentativeDto {
  @IsEnum(Nationality) nationality!: Nationality;
  @IsString() @Matches(DIGITS_REGEX, { message: 'La cédula del representante debe contener únicamente números' }) identityNumber!: string;
  @IsString() @Matches(NAME_REGEX, { message: 'El primer nombre del representante solo puede contener letras' }) firstName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo nombre del representante solo puede contener letras' }) middleName?: string;
  @IsString() @Matches(NAME_REGEX, { message: 'El primer apellido del representante solo puede contener letras' }) lastName!: string;
  @IsOptional() @IsString() @Matches(NAME_REGEX, { message: 'El segundo apellido del representante solo puede contener letras' }) secondLastName?: string;
  @IsOptional() @IsString() profession?: string;
  @IsString() address!: string;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsEnum(Sex) sex?: Sex;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @Matches(PHONE_REGEX, { message: 'El teléfono principal debe contener entre 10 y 15 dígitos' }) phone1!: string;
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: 'El segundo teléfono debe contener entre 10 y 15 dígitos' }) phone2?: string;
  @IsOptional() @IsString() workplace?: string;
  @IsOptional() @IsString() workAddress?: string;
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: 'El teléfono de trabajo debe contener entre 10 y 15 dígitos' }) workPhone?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsEnum(AccountType) accountType?: AccountType;
  @IsOptional() @IsString() @Matches(DIGITS_REGEX, { message: 'El número de cuenta debe contener únicamente números' }) accountNumber?: string;
  @IsOptional() @IsIn(BLOOD_TYPES) bloodType?: string;
}

export class UpdateRepresentativeDto extends PartialType(RepresentativeDto) {}

export class LinkRepresentativeDto {
  @IsString() studentId!: string;
  @IsEnum(RelationshipType) relationship!: RelationshipType;
  @IsBoolean() isPrimary!: boolean;
  @IsBoolean() livesWithStudent!: boolean;
  @IsOptional() @IsString() authorizationDescription?: string;
}

export class ContributionDto {
  @IsString() academicYearId!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

@Injectable()
export class RepresentativesService {
  constructor(private db: PrismaService) {}

  list(search?: string, active?: boolean) {
    const term = search?.trim();
    const numericTerm = term?.replace(/^[VEve][-\s]?/, '').replace(/\D/g, '');
    return this.db.representative.findMany({
      where: {
        ...(active === undefined ? {} : { active }),
        ...(term
          ? {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                ...(numericTerm ? [{ identityNumber: { contains: numericTerm } }] : []),
                ...(numericTerm ? [{ phone1: { contains: numericTerm } }] : []),
              ],
            }
          : {}),
      },
      include: {
        students: { include: { student: true } },
        contributions: { include: { academicYear: true }, orderBy: { paidAt: 'desc' } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  get(id: string) {
    return this.db.representative.findUniqueOrThrow({
      where: { id },
      include: {
        students: {
          include: {
            student: { include: { enrollments: { take: 1, orderBy: { registrationDate: 'desc' }, include: { academicYear: true, section: true, studyPlan: true } } } },
          },
        },
        contributions: { include: { academicYear: true }, orderBy: { paidAt: 'desc' } },
      },
    });
  }

  private normalize(d: Partial<RepresentativeDto>) {
    const data: Record<string, unknown> = { ...d };
    if (d.birthDate) data.birthDate = new Date(d.birthDate);
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'string') {
        let value = String(data[key]).trim();
        if (key === 'email') value = value.toLocaleLowerCase('es-VE');
        if (UPPERCASE_FIELDS.has(key)) value = value.toLocaleUpperCase('es-VE');
        data[key] = value === '' ? null : value;
      }
    }
    return data;
  }

  async create(d: RepresentativeDto) {
    try {
      return await this.db.representative.create({ data: this.normalize(d) as Prisma.RepresentativeUncheckedCreateInput });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Ya existe un representante con esa cédula');
      throw error;
    }
  }

  async update(id: string, d: UpdateRepresentativeDto) {
    try {
      return await this.db.representative.update({ where: { id }, data: this.normalize(d) as Prisma.RepresentativeUncheckedUpdateInput });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Ya existe un representante con esa cédula');
      throw error;
    }
  }

  setActive(id: string, active: boolean) {
    return this.db.representative.update({ where: { id }, data: { active } });
  }

  async link(id: string, d: LinkRepresentativeDto) {
    const [representative, student] = await Promise.all([
      this.db.representative.findUnique({ where: { id } }),
      this.db.student.findUnique({ where: { id: d.studentId } }),
    ]);
    if (!representative?.active) throw new BadRequestException('El representante no existe o está inactivo');
    if (!student?.active) throw new BadRequestException('El estudiante no existe o está inactivo');

    return this.db.$transaction(async (tx) => {
      if (d.isPrimary) {
        await tx.studentRepresentative.updateMany({ where: { studentId: d.studentId }, data: { isPrimary: false } });
      }
      const authorizationDescription = d.authorizationDescription?.trim().toLocaleUpperCase('es-VE') || null;
      return tx.studentRepresentative.upsert({
        where: { studentId_representativeId: { studentId: d.studentId, representativeId: id } },
        update: {
          relationship: d.relationship,
          isPrimary: d.isPrimary,
          livesWithStudent: d.livesWithStudent,
          authorizationDescription,
        },
        create: {
          representativeId: id,
          studentId: d.studentId,
          relationship: d.relationship,
          isPrimary: d.isPrimary,
          livesWithStudent: d.livesWithStudent,
          authorizationDescription,
        },
      });
    });
  }

  unlink(id: string, studentId: string) {
    return this.db.studentRepresentative.delete({
      where: { studentId_representativeId: { studentId, representativeId: id } },
    });
  }

  async contribution(id: string, d: ContributionDto) {
    const year = await this.db.academicYear.findUnique({ where: { id: d.academicYearId } });
    if (!year) throw new BadRequestException('Año escolar no válido');
    return this.db.contribution.upsert({
      where: { representativeId_academicYearId: { representativeId: id, academicYearId: d.academicYearId } },
      update: {
        amount: d.amount,
        paidAt: d.paidAt ? new Date(d.paidAt) : new Date(),
        reference: d.reference?.trim().toLocaleUpperCase('es-VE'),
        notes: d.notes?.trim().toLocaleUpperCase('es-VE'),
      },
      create: {
        representativeId: id,
        academicYearId: d.academicYearId,
        amount: d.amount,
        paidAt: d.paidAt ? new Date(d.paidAt) : new Date(),
        reference: d.reference?.trim().toLocaleUpperCase('es-VE'),
        notes: d.notes?.trim().toLocaleUpperCase('es-VE'),
      },
    });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('representatives')
export class RepresentativesController {
  constructor(private s: RepresentativesService) {}

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
  create(@Body() d: RepresentativeDto) {
    return this.s.create(d);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Patch(':id')
  update(@Param('id') id: string, @Body() d: UpdateRepresentativeDto) {
    return this.s.update(id, d);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Patch(':id/active')
  active(@Param('id') id: string, @Body('active') active: boolean) {
    return this.s.setActive(id, !!active);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/students')
  link(@Param('id') id: string, @Body() d: LinkRepresentativeDto) {
    return this.s.link(id, d);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/students/:studentId/remove')
  unlink(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.s.unlink(id, studentId);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post(':id/contributions')
  contribution(@Param('id') id: string, @Body() d: ContributionDto) {
    return this.s.contribution(id, d);
  }
}
