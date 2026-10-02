import { BadRequestException, Body, Controller, Get, Injectable, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/security';
import { automaticEnrollmentCloseDate } from '../common/school-calendar';
import { EnrollmentService } from '../enrollment/enrollment';

const SECTION_NAME = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/u;

class SectionDto {
  @IsString() academicYearId!: string;
  @IsString() studyPlanId!: string;
  @IsOptional() @IsString() mentionId?: string;
  @IsInt() @Min(1) @Max(6) gradeLevel!: number;
  @IsString() sectionNameId!: string;
  @IsString() @IsIn(['INTEGRAL', 'MEDIO DÍA MAÑANA', 'MEDIO DÍA TARDE'], { message: 'Seleccione un turno válido: INTEGRAL, MEDIO DÍA MAÑANA o MEDIO DÍA TARDE' }) shift!: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
}

class SectionNameDto {
  @IsString()
  @Matches(SECTION_NAME, { message: 'El nombre de la sección solo puede contener letras' })
  name!: string;
}

class UpdateSectionNameDto {
  @IsOptional()
  @IsString()
  @Matches(SECTION_NAME, { message: 'El nombre de la sección solo puede contener letras' })
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class MentionDto {
  @IsString() studyPlanId!: string;

  @IsString()
  @Matches(SECTION_NAME, { message: 'El nombre de la mención solo puede contener letras' })
  name!: string;
}

class UpdateMentionDto {
  @IsOptional()
  @IsString()
  @Matches(SECTION_NAME, { message: 'El nombre de la mención solo puede contener letras' })
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class AcademicYearDto {
  @IsString() name!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsNumber() @Min(0) contributionAmount!: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

class CloneSectionsDto { @IsString() sourceAcademicYearId!: string; }

@Injectable()
export class AcademicService {
  constructor(private db: PrismaService, private enrollmentService: EnrollmentService) {}

  private async ensureAutomaticCloseDates() {
    const rows = await this.db.academicYear.findMany({ select: { id: true, startDate: true, enrollmentCloseDate: true } });
    for (const row of rows) {
      const expected = automaticEnrollmentCloseDate(row.startDate);
      if (!row.enrollmentCloseDate || row.enrollmentCloseDate.getTime() !== expected.getTime()) {
        await this.db.academicYear.update({ where: { id: row.id }, data: { enrollmentCloseDate: expected } });
      }
    }
  }

  async years() {
    // Regla institucional permanente: cada período cierra matrícula el 31 de octubre
    // del año en que comienza. También normaliza períodos creados en versiones anteriores.
    await this.ensureAutomaticCloseDates();
    return this.db.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: { gradingPolicy: true, _count: { select: { sections: true, enrollments: true } } },
    });
  }

  plans() {
    return this.db.studyPlan.findMany({
      where: { active: true },
      include: {
        subjects: { include: { subject: true }, orderBy: [{ gradeLevel: 'asc' }, { sortOrder: 'asc' }] },
        mentions: { where: { active: true }, orderBy: { name: 'asc' } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async sections(year?: string, studyPlanId?: string, gradeLevel?: number, mentionId?: string) {
    if (year) {
      const current = await this.db.academicYear.findUnique({ where: { id: year }, select: { id: true, startDate: true, enrollmentCloseDate: true } });
      if (current) {
        const expected = automaticEnrollmentCloseDate(current.startDate);
        if (!current.enrollmentCloseDate || current.enrollmentCloseDate.getTime() !== expected.getTime()) {
          await this.db.academicYear.update({ where: { id: current.id }, data: { enrollmentCloseDate: expected } });
        }
        // Al consultar las secciones desde el 01/11, la nómina se materializa
        // automáticamente sin botón ni intervención del usuario. El 31/10 aún es provisional.
        await this.enrollmentService.ensureYearRostersLockedIfDue(year, new Date());
      }
    }
    return this.db.section.findMany({
      where: { academicYearId: year, studyPlanId, gradeLevel, mentionId: mentionId || undefined },
      include: { academicYear: true, studyPlan: true, mention: true, _count: { select: { enrollments: true } } },
      orderBy: [{ gradeLevel: 'asc' }, { mentionName: 'asc' }, { name: 'asc' }],
    });
  }

  sectionNames(active?: boolean) {
    return this.db.sectionName.findMany({
      where: active === undefined ? {} : { active },
      orderBy: { name: 'asc' },
    });
  }

  mentions(studyPlanId?: string, active?: boolean) {
    return this.db.mention.findMany({
      where: {
        studyPlanId: studyPlanId || undefined,
        ...(active === undefined ? {} : { active }),
      },
      include: { studyPlan: true, _count: { select: { sections: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createMention(d: MentionDto) {
    await this.db.studyPlan.findUniqueOrThrow({ where: { id: d.studyPlanId } });
    const name = d.name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-VE');
    const existing = await this.db.mention.findUnique({
      where: { studyPlanId_name: { studyPlanId: d.studyPlanId, name } },
    });
    if (existing?.active) throw new BadRequestException('Esa mención ya está registrada para el plan seleccionado');
    if (existing && !existing.active) {
      return this.db.mention.update({ where: { id: existing.id }, data: { active: true } });
    }
    return this.db.mention.create({ data: { studyPlanId: d.studyPlanId, name } });
  }

  async updateMention(id: string, d: UpdateMentionDto) {
    const current = await this.db.mention.findUniqueOrThrow({ where: { id }, include: { studyPlan: true } });
    const data: { name?: string; active?: boolean } = {};
    if (d.name !== undefined) {
      const name = d.name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-VE');
      const duplicate = await this.db.mention.findFirst({ where: { studyPlanId: current.studyPlanId, name, NOT: { id } } });
      if (duplicate) throw new BadRequestException('Esa mención ya está registrada para el plan seleccionado');
      data.name = name;
    }
    if (d.active !== undefined) data.active = d.active;
    return this.db.mention.update({ where: { id }, data });
  }

  async createSectionName(d: SectionNameDto) {
    const name = d.name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-VE');
    const existing = await this.db.sectionName.findUnique({ where: { name } });
    if (existing?.active) throw new BadRequestException('Ese nombre de sección ya está registrado');
    if (existing && !existing.active) {
      return this.db.sectionName.update({ where: { id: existing.id }, data: { active: true } });
    }
    return this.db.sectionName.create({ data: { name } });
  }

  async updateSectionName(id: string, d: UpdateSectionNameDto) {
    await this.db.sectionName.findUniqueOrThrow({ where: { id } });
    const data: { name?: string; active?: boolean } = {};
    if (d.name !== undefined) {
      const name = d.name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-VE');
      const duplicate = await this.db.sectionName.findFirst({ where: { name, NOT: { id } } });
      if (duplicate) throw new BadRequestException('Ese nombre de sección ya está registrado');
      data.name = name;
    }
    if (d.active !== undefined) data.active = d.active;
    return this.db.sectionName.update({ where: { id }, data });
  }

  async createYear(d: AcademicYearDto) {
    const start = new Date(d.startDate);
    const end = new Date(d.endDate);
    const close = automaticEnrollmentCloseDate(start);
    if (end <= start) throw new BadRequestException('La fecha de culminación debe ser posterior a la fecha de inicio');
    if (close < start || close > end) throw new BadRequestException('El año escolar debe incluir el 31 de octubre, fecha institucional automática de cierre de matrícula');
    const normalizedName = d.name.trim().toUpperCase();
    const exists = await this.db.academicYear.findUnique({ where: { name: normalizedName } });
    if (exists) throw new BadRequestException('Ya existe un año escolar con este nombre');
    return this.db.$transaction(async tx => {
      if (d.active) await tx.academicYear.updateMany({ data: { active: false } });
      const year = await tx.academicYear.create({
        data: {
          name: normalizedName,
          startDate: start,
          endDate: end,
          enrollmentCloseDate: close,
          active: !!d.active,
          contributionAmount: d.contributionAmount,
        },
      });
      await tx.gradingPolicy.create({ data: { academicYearId: year.id } });
      const total = end.getTime() - start.getTime();
      for (let n = 1; n <= 3; n++) {
        const lapseStart = new Date(start.getTime() + Math.floor(total * (n - 1) / 3));
        const lapseEnd = n === 3 ? end : new Date(start.getTime() + Math.floor(total * n / 3) - 86400000);
        await tx.pedagogicalLapse.create({ data: { academicYearId: year.id, number: n, startDate: lapseStart, endDate: lapseEnd } });
      }
      return year;
    });
  }

  async activateYear(id: string) {
    await this.db.academicYear.findUniqueOrThrow({ where: { id } });
    return this.db.$transaction(async tx => {
      await tx.academicYear.updateMany({ data: { active: false } });
      return tx.academicYear.update({ where: { id }, data: { active: true } });
    });
  }

  async createSection(d: SectionDto) {
    const [year, plan, sectionName, mention] = await Promise.all([
      this.db.academicYear.findUniqueOrThrow({ where: { id: d.academicYearId } }),
      this.db.studyPlan.findUniqueOrThrow({ where: { id: d.studyPlanId } }),
      this.db.sectionName.findUnique({ where: { id: d.sectionNameId } }),
      d.mentionId ? this.db.mention.findUnique({ where: { id: d.mentionId } }) : Promise.resolve(null),
    ]);
    void year;
    if (d.gradeLevel > plan.maxGrade) throw new BadRequestException('El grado excede el máximo permitido por el plan de estudio');
    if (!sectionName?.active) throw new BadRequestException('Seleccione un nombre de sección activo del catálogo administrativo');
    if (!mention?.active || mention.studyPlanId !== plan.id) {
      throw new BadRequestException('Seleccione una mención activa correspondiente al plan de estudio');
    }

    const duplicate = await this.db.section.findFirst({
      where: {
        academicYearId: d.academicYearId,
        studyPlanId: d.studyPlanId,
        gradeLevel: d.gradeLevel,
        name: sectionName.name,
      },
    });
    if (duplicate) throw new BadRequestException('Ya existe esa sección para el año, plan y grado seleccionados');

    return this.db.section.create({
      data: {
        academicYearId: d.academicYearId,
        studyPlanId: d.studyPlanId,
        mentionId: mention.id,
        mentionName: mention.name,
        gradeLevel: d.gradeLevel,
        name: sectionName.name,
        shift: d.shift.trim().toLocaleUpperCase('es-VE'),
        capacity: d.capacity,
      },
    });
  }

  async cloneSections(targetAcademicYearId: string, d: CloneSectionsDto) {
    const [target, source] = await Promise.all([
      this.db.academicYear.findUniqueOrThrow({ where: { id: targetAcademicYearId } }),
      this.db.academicYear.findUniqueOrThrow({ where: { id: d.sourceAcademicYearId } }),
    ]);
    if (target.id === source.id) throw new BadRequestException('El año origen y destino deben ser diferentes');
    const rows = await this.db.section.findMany({ where: { academicYearId: source.id }, include: { mention: true } });
    await this.db.section.createMany({
      data: rows.map(s => ({
        academicYearId: target.id,
        studyPlanId: s.studyPlanId,
        mentionId: s.mentionId,
        mentionName: s.mention?.name || s.mentionName,
        gradeLevel: s.gradeLevel,
        name: s.name,
        shift: s.shift,
        capacity: s.capacity,
      })),
      skipDuplicates: true,
    });
    return this.sections(target.id);
  }

  geography() {
    return this.db.federalState.findMany({
      include: { municipalities: { include: { parishes: true }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic')
export class AcademicController {
  constructor(private s: AcademicService) {}

  @Get('years') years() { return this.s.years(); }
  @Get('plans') plans() { return this.s.plans(); }
  @Get('sections') sections(@Query('academicYearId') year?: string, @Query('studyPlanId') plan?: string, @Query('gradeLevel') grade?: string, @Query('mentionId') mentionId?: string) {
    return this.s.sections(year, plan, grade ? Number(grade) : undefined, mentionId);
  }
  @Get('section-names') sectionNames(@Query('active') active?: string) {
    return this.s.sectionNames(active === undefined ? undefined : active === 'true');
  }

  @Get('mentions') mentions(@Query('studyPlanId') studyPlanId?: string, @Query('active') active?: string) {
    return this.s.mentions(studyPlanId, active === undefined ? undefined : active === 'true');
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('years')
  createYear(@Body() d: AcademicYearDto) { return this.s.createYear(d); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch('years/:id/activate')
  activate(@Param('id') id: string) { return this.s.activateYear(id); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('years/:id/clone-sections')
  clone(@Param('id') id: string, @Body() d: CloneSectionsDto) { return this.s.cloneSections(id, d); }

  @Roles(Role.ADMIN)
  @Post('section-names')
  createSectionName(@Body() d: SectionNameDto) { return this.s.createSectionName(d); }

  @Roles(Role.ADMIN)
  @Patch('section-names/:id')
  updateSectionName(@Param('id') id: string, @Body() d: UpdateSectionNameDto) { return this.s.updateSectionName(id, d); }

  @Roles(Role.ADMIN)
  @Post('mentions')
  createMention(@Body() d: MentionDto) { return this.s.createMention(d); }

  @Roles(Role.ADMIN)
  @Patch('mentions/:id')
  updateMention(@Param('id') id: string, @Body() d: UpdateMentionDto) { return this.s.updateMention(id, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('sections')
  section(@Body() d: SectionDto) { return this.s.createSection(d); }

  @Get('geography') geo() { return this.s.geography(); }
}
