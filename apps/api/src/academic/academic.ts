import { BadRequestException, Body, Controller, Delete, Get, Injectable, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { EducationModality, EnrollmentSubjectOrigin, GradingType, PendingStatus, ResultStatus, Role, StudentCondition } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/security';
import { automaticEnrollmentCloseDate } from '../common/school-calendar';
import { EnrollmentService } from '../enrollment/enrollment';
import { deriveAcademicDecision } from '../enrollment/enrollment.rules';

const SECTION_NAME = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/u;
const ACADEMIC_NAME = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9'(),.\-/ ]+$/u;

const PLAN_CODE = /^\d{5}$/;

class StudyPlanDto {
  @IsEnum(EducationModality) modality!: EducationModality;
  @IsString() @Matches(PLAN_CODE, { message: 'El código del plan debe contener exactamente 5 dígitos' }) code!: string;
  @IsString() @MaxLength(160) optionName!: string;
  @IsOptional() @IsString() @MaxLength(120) specialtyName?: string;
  @IsBoolean() hasMention!: boolean;
  @IsOptional() @IsString() @MaxLength(160) mentionName?: string;
}

class PlanActiveDto { @IsBoolean() active!: boolean; }

class PlanSubjectDto {
  @IsInt() @Min(1) @Max(6) gradeLevel!: number;
  @IsString() @MaxLength(180) name!: string;
  @IsOptional() @IsInt() @Min(1) @Max(60) weeklyHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3000) annualHours?: number;
  @IsOptional() @IsString() @MaxLength(160) component?: string;
  @IsOptional() @IsEnum(GradingType) gradingType?: GradingType;
}

class UpdatePlanSubjectDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsInt() @Min(1) @Max(60) weeklyHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3000) annualHours?: number;
  @IsOptional() @IsString() @MaxLength(160) component?: string;
  @IsOptional() @IsEnum(GradingType) gradingType?: GradingType;
  @IsOptional() @IsBoolean() active?: boolean;
}

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
  @Matches(ACADEMIC_NAME, { message: 'El nombre de la mención contiene caracteres no permitidos' })
  name!: string;
}

class UpdateMentionDto {
  @IsOptional()
  @IsString()
  @Matches(ACADEMIC_NAME, { message: 'El nombre de la mención contiene caracteres no permitidos' })
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

  plans(includeInactive = false) {
    return this.db.studyPlan.findMany({
      where: includeInactive ? {} : { active: true },
      include: {
        subjects: { include: { subject: true }, orderBy: [{ gradeLevel: 'asc' }, { sortOrder: 'asc' }] },
        mentions: { where: includeInactive ? {} : { active: true }, orderBy: { name: 'asc' } },
        _count: { select: { enrollments: true, sections: true } },
      },
      orderBy: [{ modality: 'asc' }, { code: 'asc' }],
    });
  }

  private normalizeAcademicText(value?: string | null) {
    return value?.trim() ? value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-VE') : undefined;
  }

  private async planReadiness(planId: string) {
    const plan = await this.db.studyPlan.findUniqueOrThrow({
      where: { id: planId },
      include: { subjects: { where: { active: true } }, mentions: { where: { active: true } } },
    });
    const missingGrades: number[] = [];
    for (let grade = 1; grade <= plan.maxGrade; grade++) {
      if (!plan.subjects.some((subject) => subject.gradeLevel === grade)) missingGrades.push(grade);
    }
    const missingMention = plan.hasMention && plan.mentions.length === 0;
    return {
      ready: missingGrades.length === 0 && !missingMention,
      missingGrades,
      missingMention,
      plan,
    };
  }

  async createStudyPlan(d: StudyPlanDto) {
    const code = d.code.trim();
    const duplicate = await this.db.studyPlan.findFirst({ where: { code } });
    if (duplicate) throw new BadRequestException(`El código ${code} ya pertenece a un plan de estudio registrado`);
    const optionName = this.normalizeAcademicText(d.optionName)!;
    const specialtyName = this.normalizeAcademicText(d.specialtyName);
    const mentionName = this.normalizeAcademicText(d.mentionName);
    if (d.modality === EducationModality.MEDIA_TECNICA && !specialtyName) throw new BadRequestException('En Media Técnica debe indicar la especialidad');
    if (d.hasMention || mentionName) throw new BadRequestException('No se permiten menciones manuales dentro de un código de plan. Registre la denominación oficial completa del nuevo plan; cada código identifica una única opción académica.');
    const maxGrade = d.modality === EducationModality.MEDIA_TECNICA ? 6 : 5;
    const titleName = optionName;
    return this.db.$transaction(async (tx) => {
      const plan = await tx.studyPlan.create({
        data: {
          code,
          name: optionName,
          modality: d.modality,
          specialtyName,
          optionName,
          hasMention: false,
          officialCatalog: false,
          sourceReference: 'PLAN INCORPORADO MANUALMENTE POR LA INSTITUCIÓN',
          curriculumVerified: false,
          maxGrade,
          titleName,
          active: false,
          effectiveFrom: new Date(),
        },
      });
      return tx.studyPlan.findUnique({ where: { id: plan.id }, include: { mentions: true, subjects: { include: { subject: true } } } });
    });
  }

  async setStudyPlanActive(id: string, active: boolean) {
    const current = await this.db.studyPlan.findUniqueOrThrow({ where: { id } });
    if (active) {
      const readiness = await this.planReadiness(id);
      if (!readiness.ready) {
        const reasons = [
          readiness.missingGrades.length ? `faltan materias en: ${readiness.missingGrades.map((g) => `${g}° AÑO`).join(', ')}` : null,
          readiness.missingMention ? 'el plan requiere una mención activa' : null,
        ].filter(Boolean).join(' · ');
        throw new BadRequestException(`No puede activar el plan ${current.code}: ${reasons}`);
      }
    }
    return this.db.studyPlan.update({ where: { id }, data: { active, curriculumVerified: active ? true : current.curriculumVerified } });
  }

  async deleteStudyPlan(id: string) {
    const plan = await this.db.studyPlan.findUniqueOrThrow({
      where: { id },
      include: {
        subjects: { select: { subjectId: true } },
        _count: { select: { enrollments: true, sections: true } },
      },
    });

    if (plan.officialCatalog) {
      throw new BadRequestException('Los planes del catálogo nacional no se eliminan. Puede inactivarlos para que no aparezcan en nuevas secciones o matrículas.');
    }

    if (plan._count.enrollments > 0 || plan._count.sections > 0) {
      const details = [
        plan._count.enrollments > 0 ? `${plan._count.enrollments} matrícula(s)` : null,
        plan._count.sections > 0 ? `${plan._count.sections} sección(es)` : null,
      ].filter(Boolean).join(' y ');
      throw new BadRequestException(`No se puede eliminar el plan ${plan.code} porque ya tiene ${details}. Para preservar el histórico solo puede inactivarse.`);
    }

    const subjectIds = [...new Set(plan.subjects.map((row) => row.subjectId))];

    await this.db.$transaction(async (tx) => {
      // Mention y StudyPlanSubject usan onDelete:Cascade. Section/Enrollment no se
      // eliminan jamás de forma automática; las validaciones anteriores lo impiden.
      await tx.studyPlan.delete({ where: { id } });

      // Las materias creadas exclusivamente para un plan manual quedarían huérfanas.
      // Se limpian solo cuando ya no pertenecen a ninguna otra malla curricular.
      if (subjectIds.length) {
        await tx.subject.deleteMany({
          where: {
            id: { in: subjectIds },
            plans: { none: {} },
          },
        });
      }
    });

    return {
      deleted: true,
      id: plan.id,
      code: plan.code,
      message: `Plan ${plan.code} eliminado definitivamente.`,
    };
  }

  async planCurriculum(id: string) {
    const plan = await this.db.studyPlan.findUniqueOrThrow({
      where: { id },
      include: {
        subjects: { include: { subject: true }, orderBy: [{ gradeLevel: 'asc' }, { sortOrder: 'asc' }] },
        mentions: { orderBy: { name: 'asc' } },
        _count: { select: { enrollments: true, sections: true } },
      },
    });
    const readiness = await this.planReadiness(id);
    return { ...plan, readiness: { ready: readiness.ready, missingGrades: readiness.missingGrades, missingMention: readiness.missingMention } };
  }

  private async ensureCurriculumEditable(planId: string) {
    const used = await this.db.enrollment.count({ where: { studyPlanId: planId } });
    if (used > 0) throw new BadRequestException('La malla de este plan ya tiene estudiantes matriculados. Para preservar el histórico no puede modificarse directamente; debe crearse una nueva versión del plan.');
  }

  private slug(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase().slice(0, 18) || 'MATERIA';
  }

  async addPlanSubject(planId: string, d: PlanSubjectDto) {
    await this.ensureCurriculumEditable(planId);
    const plan = await this.db.studyPlan.findUniqueOrThrow({ where: { id: planId } });
    if (d.gradeLevel > plan.maxGrade) throw new BadRequestException(`El plan ${plan.code} solo contempla hasta ${plan.maxGrade}° AÑO`);
    if (!d.weeklyHours && !d.annualHours) throw new BadRequestException('Indique carga horaria semanal o anual');
    const name = this.normalizeAcademicText(d.name)!;
    const duplicate = await this.db.studyPlanSubject.findFirst({
      where: { studyPlanId: planId, gradeLevel: d.gradeLevel, subject: { name } },
    });
    if (duplicate) throw new BadRequestException('Esa materia ya está registrada en el año seleccionado');
    const base = `${plan.code}-${d.gradeLevel}-${this.slug(name)}`.slice(0, 46);
    let code = base;
    let n = 1;
    while (await this.db.subject.findUnique({ where: { code } })) code = `${base}-${++n}`.slice(0, 50);
    const sort = await this.db.studyPlanSubject.aggregate({ where: { studyPlanId: planId, gradeLevel: d.gradeLevel }, _max: { sortOrder: true } });
    return this.db.$transaction(async (tx) => {
      const subject = await tx.subject.create({ data: { code, name, gradingType: d.gradingType || GradingType.NUMERIC } });
      const row = await tx.studyPlanSubject.create({
        data: { studyPlanId: planId, subjectId: subject.id, gradeLevel: d.gradeLevel, weeklyHours: d.weeklyHours, annualHours: d.annualHours, component: this.normalizeAcademicText(d.component), sortOrder: (sort._max.sortOrder ?? -1) + 1 },
        include: { subject: true },
      });
      await tx.studyPlan.update({ where: { id: planId }, data: { curriculumVerified: false } });
      return row;
    });
  }

  async updatePlanSubject(id: string, d: UpdatePlanSubjectDto) {
    const row = await this.db.studyPlanSubject.findUniqueOrThrow({ where: { id }, include: { subject: true } });
    await this.ensureCurriculumEditable(row.studyPlanId);
    return this.db.$transaction(async (tx) => {
      if (d.name !== undefined || d.gradingType !== undefined) {
        await tx.subject.update({ where: { id: row.subjectId }, data: { name: d.name !== undefined ? this.normalizeAcademicText(d.name) : undefined, gradingType: d.gradingType } });
      }
      return tx.studyPlanSubject.update({
        where: { id },
        data: { weeklyHours: d.weeklyHours, annualHours: d.annualHours, component: d.component !== undefined ? this.normalizeAcademicText(d.component) : undefined, active: d.active },
        include: { subject: true },
      });
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

  async createMention(_d: MentionDto) {
    throw new BadRequestException('Las menciones/opciones no se crean manualmente. Cada código de plan tiene una denominación académica única definida por el catálogo oficial.');
  }

  async updateMention(_id: string, _d: UpdateMentionDto) {
    throw new BadRequestException('Las menciones/opciones de un plan no pueden renombrarse, activarse o inactivarse manualmente. Deben coincidir con la denominación oficial asociada al código del plan.');
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
    const year = await this.db.academicYear.findUniqueOrThrow({ where: { id } });
    if (year.academicClosedAt) throw new BadRequestException('Un año escolar finalizado académicamente no puede volver a activarse');
    return this.db.$transaction(async tx => {
      await tx.academicYear.updateMany({ data: { active: false } });
      return tx.academicYear.update({ where: { id }, data: { active: true } });
    });
  }


  async academicClosureReadiness(id: string) {
    const year = await this.db.academicYear.findUniqueOrThrow({
      where: { id },
      include: { gradingPolicy: true },
    });
    const activeConditions = [StudentCondition.REGULAR, StudentCondition.MATERIA_PENDIENTE, StudentCondition.REPITIENTE, StudentCondition.GRADUADO];
    const enrollments = await this.db.enrollment.findMany({
      where: { academicYearId: id, condition: { in: activeConditions } },
      include: {
        student: true,
        studyPlan: true,
        section: true,
        annualResults: true,
        curriculumSubjects: { where: { active: true }, include: { studyPlanSubject: { include: { subject: true } } } },
        pendingSubjects: { include: { studyPlanSubject: { include: { subject: true } } } },
      },
      orderBy: [{ section: { name: 'asc' } }, { student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });

    const blockers: any[] = [];
    const outcomes: any[] = [];
    const pendingMaxSubjects = year.gradingPolicy?.pendingMaxSubjects ?? 2;

    for (const e of enrollments) {
      let expected = e.curriculumSubjects
        .filter(x => x.origin !== EnrollmentSubjectOrigin.MATERIA_PENDIENTE)
        .map(x => x.studyPlanSubject);
      if (!expected.length) {
        expected = await this.db.studyPlanSubject.findMany({
          where: { studyPlanId: e.studyPlanId, gradeLevel: e.gradeLevel, active: true },
          include: { subject: true },
          orderBy: { sortOrder: 'asc' },
        });
      }
      const resultMap = new Map<string, any>(e.annualResults.map(r => [r.studyPlanSubjectId, r]));
      const missing = expected.filter(x => !resultMap.has(x.id) || resultMap.get(x.id)?.status === ResultStatus.PENDIENTE);
      const failed = expected.map(x => resultMap.get(x.id)).filter((r: any) => r?.status === ResultStatus.REPROBADO);
      const unresolvedPending = e.pendingSubjects.filter(p => p.status !== PendingStatus.APROBADA);
      const reasons: string[] = [];
      if (!expected.length) reasons.push('No tiene materias activas configuradas para cerrar la definitiva');
      if (missing.length) reasons.push(`Faltan ${missing.length} definitiva(s): ${missing.map(x => x.subject.name).join(', ')}`);
      if (unresolvedPending.length) reasons.push(`Tiene ${unresolvedPending.length} materia(s) pendiente(s) sin resolver: ${unresolvedPending.map(p => p.studyPlanSubject?.subject?.name || p.manualSubjectName || 'MATERIA PENDIENTE').join(', ')}`);
      if (reasons.length) {
        blockers.push({
          enrollmentId: e.id,
          studentId: e.studentId,
          student: `${e.student.lastName} ${e.student.secondLastName || ''} ${e.student.firstName} ${e.student.middleName || ''}`.replace(/\s+/g, ' ').trim(),
          identityNumber: e.student.identityNumber,
          gradeLevel: e.gradeLevel,
          section: e.section.name,
          reasons,
        });
        continue;
      }
      const decision = deriveAcademicDecision({
        gradeLevel: e.gradeLevel,
        maxGrade: e.studyPlan.maxGrade,
        failedCount: failed.length,
        pendingMaxSubjects,
      });
      const finalCondition = decision.graduationEligible ? StudentCondition.GRADUADO : decision.condition;
      outcomes.push({ enrollmentId: e.id, finalCondition, failedCount: failed.length, graduationEligible: decision.graduationEligible });
    }

    const counts = {
      totalMatriculados: await this.db.enrollment.count({ where: { academicYearId: id } }),
      evaluables: enrollments.length,
      retirados: await this.db.enrollment.count({ where: { academicYearId: id, condition: { in: [StudentCondition.RETIRADO, StudentCondition.RETIRADO_MODIFICADO] } } }),
      listos: outcomes.length,
      pendientes: blockers.length,
      regular: outcomes.filter(x => x.finalCondition === StudentCondition.REGULAR).length,
      materiaPendiente: outcomes.filter(x => x.finalCondition === StudentCondition.MATERIA_PENDIENTE).length,
      repitiente: outcomes.filter(x => x.finalCondition === StudentCondition.REPITIENTE).length,
      graduado: outcomes.filter(x => x.finalCondition === StudentCondition.GRADUADO).length,
    };
    return {
      year: { id: year.id, name: year.name, startDate: year.startDate, endDate: year.endDate, academicClosedAt: year.academicClosedAt, academicClosedBy: year.academicClosedBy, active: year.active },
      ready: !year.academicClosedAt && enrollments.length > 0 && blockers.length === 0,
      alreadyClosed: !!year.academicClosedAt,
      counts,
      blockers,
      outcomes,
    };
  }

  async finalizeAcademicYear(id: string, user: any) {
    const readiness = await this.academicClosureReadiness(id);
    if (readiness.alreadyClosed) throw new BadRequestException('El año escolar ya fue finalizado académicamente');
    if (!readiness.counts.evaluables) throw new BadRequestException('No existen matrículas académicamente evaluables para finalizar este año escolar');
    if (!readiness.ready) throw new BadRequestException(`No se puede finalizar el año escolar. Existen ${readiness.counts.pendientes} estudiante(s) con cierre académico pendiente.`);
    const now = new Date();
    const closedBy = user?.email ? `${String(user.email).toLowerCase()} · ${user.role || 'USUARIO'}` : String(user?.sub || 'USUARIO');
    await this.db.$transaction(async tx => {
      for (const outcome of readiness.outcomes) {
        await tx.enrollment.update({
          where: { id: outcome.enrollmentId },
          data: {
            condition: outcome.finalCondition,
            academicCondition: outcome.finalCondition,
            academicOutcomeFinalizedAt: now,
          },
        });
      }
      await tx.academicYear.update({
        where: { id },
        data: { academicClosedAt: now, academicClosedBy: closedBy, active: false },
      });
    });
    return this.academicClosureReadiness(id);
  }

  async createSection(d: SectionDto) {
    const [year, plan, sectionName, mention] = await Promise.all([
      this.db.academicYear.findUniqueOrThrow({ where: { id: d.academicYearId } }),
      this.db.studyPlan.findUniqueOrThrow({ where: { id: d.studyPlanId } }),
      this.db.sectionName.findUnique({ where: { id: d.sectionNameId } }),
      d.mentionId ? this.db.mention.findUnique({ where: { id: d.mentionId } }) : Promise.resolve(null),
    ]);
    if (year.academicClosedAt) throw new BadRequestException('No puede crear secciones en un año escolar finalizado académicamente');
    if (d.gradeLevel > plan.maxGrade) throw new BadRequestException('El grado excede el máximo permitido por el plan de estudio');
    if (!plan.active) throw new BadRequestException('El plan de estudio está inactivo para esta institución');
    if (!sectionName?.active) throw new BadRequestException('Seleccione un nombre de sección activo del catálogo administrativo');
    if (plan.hasMention) {
      if (!mention?.active || mention.studyPlanId !== plan.id) throw new BadRequestException('Seleccione una mención activa correspondiente al plan de estudio');
    } else if (mention) {
      throw new BadRequestException('El plan seleccionado no utiliza mención');
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
        mentionId: plan.hasMention ? mention?.id : null,
        mentionName: plan.hasMention ? mention?.name : null,
        gradeLevel: d.gradeLevel,
        name: sectionName.name,
        shift: d.shift.trim().toLocaleUpperCase('es-VE'),
        capacity: d.capacity,
      },
    });
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
  @Get('plans') plans(@Query('all') all?: string) { return this.s.plans(all === 'true'); }

  @Roles(Role.ADMIN)
  @Post('plans')
  createPlan(@Body() d: StudyPlanDto) { return this.s.createStudyPlan(d); }

  @Roles(Role.ADMIN)
  @Patch('plans/:id/active')
  setPlanActive(@Param('id') id: string, @Body() d: PlanActiveDto) { return this.s.setStudyPlanActive(id, d.active); }

  @Roles(Role.ADMIN)
  @Post('plans/:id/assign')
  assignPlan(@Param('id') id: string) { return this.s.setStudyPlanActive(id, true); }

  @Roles(Role.ADMIN)
  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) { return this.s.deleteStudyPlan(id); }

  @Get('plans/:id/curriculum')
  curriculum(@Param('id') id: string) { return this.s.planCurriculum(id); }

  @Roles(Role.ADMIN)
  @Post('plans/:id/subjects')
  addSubject(@Param('id') id: string, @Body() d: PlanSubjectDto) { return this.s.addPlanSubject(id, d); }

  @Roles(Role.ADMIN)
  @Patch('plan-subjects/:id')
  updateSubject(@Param('id') id: string, @Body() d: UpdatePlanSubjectDto) { return this.s.updatePlanSubject(id, d); }
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
  @Get('years/:id/closure-readiness')
  closureReadiness(@Param('id') id: string) { return this.s.academicClosureReadiness(id); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('years/:id/finalize')
  finalizeYear(@Param('id') id: string, @CurrentUser() user: any) { return this.s.finalizeAcademicYear(id, user); }

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
