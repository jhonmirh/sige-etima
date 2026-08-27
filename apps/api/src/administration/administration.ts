import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Nationality, Prisma, Role } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/security';
import { PrismaService } from '../prisma.service';

export class UpdateInstitutionDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(40) plantCode?: string | null;
  @IsOptional() @IsString() @MaxLength(40) statisticalCode?: string | null;
  @IsOptional() @IsString() @MaxLength(40) dependencyCode?: string | null;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
  @IsOptional() @IsEmail() @MaxLength(160) email?: string | null;
  @IsOptional() @IsUUID() stateId?: string | null;
  @IsOptional() @IsUUID() municipalityId?: string | null;
  @IsOptional() @IsUUID() parishId?: string | null;
  @IsOptional() @IsString() @MaxLength(80) directorTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(200) directorName?: string | null;
  @IsOptional() @IsEnum(Nationality) directorNationality?: Nationality | null;
  @IsOptional() @IsString() @MaxLength(30) directorIdentity?: string | null;
  @IsOptional() @IsString() @MaxLength(500) directorAddress?: string | null;
  @IsOptional() @IsString() @MaxLength(30) directorPhone?: string | null;
  @IsOptional() @IsEmail() @MaxLength(160) directorEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(500) schoolLogoPath?: string | null;
  @IsOptional() @IsString() @MaxLength(500) ministryLogoPath?: string | null;
}

export class AdministrationContributionDto {
  @IsUUID() representativeId!: string;
  @IsUUID() academicYearId!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9_999_999_999.99) amount!: number;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class GraduateEnrollmentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  enrollmentIds!: string[];
}

@Injectable()
export class AdministrationService {
  constructor(private db: PrismaService) {}

  institution() {
    return this.db.institution.findFirst();
  }

  async updateInstitution(data: UpdateInstitutionDto) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Debe indicar al menos un dato de la institución para actualizar');
    }

    const institution = await this.db.institution.findFirst();
    if (!institution) throw new NotFoundException('La institución no está configurada');

    const normalized = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() || null : value,
      ]),
    ) as Prisma.InstitutionUpdateInput;

    return this.db.institution.update({ where: { id: institution.id }, data: normalized });
  }

  async contribution(data: AdministrationContributionDto) {
    const [representative, academicYear] = await Promise.all([
      this.db.representative.findUnique({ where: { id: data.representativeId }, select: { id: true } }),
      this.db.academicYear.findUnique({ where: { id: data.academicYearId }, select: { id: true } }),
    ]);
    if (!representative) throw new NotFoundException('El representante indicado no existe');
    if (!academicYear) throw new NotFoundException('El año escolar indicado no existe');

    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    const reference = data.reference?.trim().toLocaleUpperCase('es-VE') || null;
    const notes = data.notes?.trim().toLocaleUpperCase('es-VE') || null;

    return this.db.contribution.upsert({
      where: {
        representativeId_academicYearId: {
          representativeId: data.representativeId,
          academicYearId: data.academicYearId,
        },
      },
      update: { amount: data.amount, paidAt, reference, notes },
      create: {
        representativeId: data.representativeId,
        academicYearId: data.academicYearId,
        amount: data.amount,
        paidAt,
        reference,
        notes,
      },
    });
  }

  async inactivateYear(yearId: string) {
    const year = await this.db.academicYear.findUnique({ where: { id: yearId }, select: { id: true } });
    if (!year) throw new NotFoundException('El año escolar indicado no existe');

    const result = await this.db.enrollment.updateMany({
      where: {
        academicYearId: yearId,
        condition: { notIn: ['GRADUADO', 'RETIRADO', 'RETIRADO_MODIFICADO'] },
      },
      data: { condition: 'INACTIVO' },
    });
    return { updated: result.count };
  }

  async graduate(ids: string[]) {
    const existing = await this.db.enrollment.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (existing.length !== new Set(ids).size) {
      throw new NotFoundException('Una o más matrículas indicadas no existen');
    }

    const result = await this.db.enrollment.updateMany({
      where: { id: { in: ids } },
      data: { condition: 'GRADUADO' },
    });
    return { updated: result.count };
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('administration')
export class AdministrationController {
  constructor(private s: AdministrationService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Get('institution')
  institution() {
    return this.s.institution();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch('institution')
  update(@Body() data: UpdateInstitutionDto) {
    return this.s.updateInstitution(data);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.SECRETARIA)
  @Post('contributions')
  contribution(@Body() data: AdministrationContributionDto) {
    return this.s.contribution(data);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('years/:id/inactivate')
  inactive(@Param('id', ParseUUIDPipe) id: string) {
    return this.s.inactivateYear(id);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('graduates')
  graduate(@Body() data: GraduateEnrollmentsDto) {
    return this.s.graduate(data.enrollmentIds);
  }
}
