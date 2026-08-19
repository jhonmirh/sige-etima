import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AssessmentForm,
  AttendanceStatus,
  AttemptStatus,
  EnrollmentSubjectOrigin,
  GradingCalculationMode,
  LapseStatus,
  ResultStatus,
  Role,
  StaffType,
  StudentCondition,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/security';
import { deriveAcademicDecision } from '../enrollment/enrollment.rules';

const ACADEMIC_ACTIVE = [
  StudentCondition.REGULAR,
  StudentCondition.MATERIA_PENDIENTE,
  StudentCondition.REPITIENTE,
];

function upper(value?: unknown) {
  return typeof value === 'string' ? value.trim().toLocaleUpperCase('es-VE') : value;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseObjective(value: unknown) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new BadRequestException('El objetivo es obligatorio y debe ser numérico. Ejemplos: 1, 1.1, 2.3');
  const number = Number(text);
  if (!Number.isFinite(number) || number <= 0) throw new BadRequestException('El objetivo debe ser un número mayor que cero');
  return number;
}

function assessmentLocalParts(value: string | Date) {
  if (value instanceof Date) {
    return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate(), hour: value.getUTCHours(), minute: value.getUTCMinutes(), date: value };
  }
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('La fecha de evaluación no es válida');
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes(), date };
  }
  const [, y, m, d, h, min] = match;
  const date = new Date(`${y}-${m}-${d}T${h}:${min}:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('La fecha de evaluación no es válida');
  return { year: Number(y), month: Number(m), day: Number(d), hour: Number(h), minute: Number(min), date };
}

@Injectable()
export class GradingService {
  constructor(private db: PrismaService) {}

  private async staffIdForUser(user: any) {
    if (!user?.sub) return null;
    const row = await this.db.user.findUnique({ where: { id: user.sub }, select: { staffId: true } });
    return row?.staffId || null;
  }

  private async assertAssignmentAccess(assignmentId: string, user: any) {
    const assignment = await this.db.teacherAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        staff: true,
        section: { include: { academicYear: true, studyPlan: true } },
        studyPlanSubject: { include: { subject: true } },
      },
    });
    if (user?.role === Role.DOCENTE) {
      const staffId = await this.staffIdForUser(user);
      if (!staffId || assignment.staffId !== staffId) throw new ForbiddenException('Esta asignación no pertenece al docente autenticado');
    }
    return assignment;
  }

  private ensureYearOpen(academicClosedAt?: Date | null) {
    if (academicClosedAt) throw new BadRequestException('El año escolar ya fue finalizado académicamente');
  }

  private ensureLapseOpen(lapse: any) {
    if (!lapse || lapse.status !== LapseStatus.OPEN) {
      throw new BadRequestException('El lapso está INACTIVO. Solo el Administrador puede activarlo antes de registrar o modificar evaluaciones y notas.');
    }
  }

  private async calculationMode(teacherAssignmentId: string, lapseId: string) {
    const config = await this.db.assignmentLapseConfig.findUnique({
      where: { teacherAssignmentId_lapseId: { teacherAssignmentId, lapseId } },
    });
    if (config?.calculationMode) return config.calculationMode;

    // Compatibilidad con evaluaciones creadas antes de V2.2.1:
    // si sus ponderaciones ya suman 100, se interpretan como porcentuales.
    const assessments = await this.db.assessment.findMany({
      where: { teacherAssignmentId, lapseId },
      select: { weight: true },
    });
    const total = assessments.reduce((acc, a) => acc + Number(a.weight), 0);
    if (assessments.length > 0 && Math.abs(total - 100) <= 0.001) return GradingCalculationMode.PERCENTUAL;
    return GradingCalculationMode.ACUMULATIVA;
  }

  private async assertAnnualNotFinalized(assignment: any) {
    const count = await this.db.annualSubjectResult.count({
      where: {
        studyPlanSubjectId: assignment.studyPlanSubjectId,
        enrollment: { sectionId: assignment.sectionId },
      },
    });
    if (count > 0) throw new BadRequestException('La definitiva anual de esta materia ya tiene registros. No se pueden modificar evaluaciones ni lapsos sin corregir primero la definitiva.');
  }

  private async eligibleEnrollments(sectionId: string, studyPlanSubjectId: string) {
    const rows = await this.db.enrollment.findMany({
      where: { sectionId, condition: { in: ACADEMIC_ACTIVE } },
      include: {
        student: true,
        curriculumSubjects: { where: { active: true } },
        withdrawal: true,
      },
    });
    const filtered = rows.filter((e) => !e.curriculumSubjects.length || e.curriculumSubjects.some((c) => c.studyPlanSubjectId === studyPlanSubjectId));
    return filtered.sort((a, b) => {
      const an = a.listNumber ?? Number.MAX_SAFE_INTEGER;
      const bn = b.listNumber ?? Number.MAX_SAFE_INTEGER;
      if (an !== bn) return an - bn;
      const ai = Number(a.student.identityNumber || a.student.schoolIdentityNumber || '999999999');
      const bi = Number(b.student.identityNumber || b.student.schoolIdentityNumber || '999999999');
      if (ai !== bi) return ai - bi;
      return `${a.student.lastName} ${a.student.firstName}`.localeCompare(`${b.student.lastName} ${b.student.firstName}`, 'es');
    });
  }

  async context(user: any, academicYearId?: string) {
    const years = await this.db.academicYear.findMany({
      include: {
        gradingPolicy: true,
        lapses: { orderBy: { number: 'asc' } },
      },
      orderBy: { startDate: 'desc' },
    });
    const selectedYearId = academicYearId || years.find((y) => y.active)?.id || years[0]?.id || null;
    let staffId: string | null = null;
    if (user?.role === Role.DOCENTE) staffId = await this.staffIdForUser(user);

    const assignments = selectedYearId ? await this.db.teacherAssignment.findMany({
      where: {
        active: true,
        section: { academicYearId: selectedYearId },
        ...(user?.role === Role.DOCENTE ? { staffId: staffId || '__SIN_PERSONAL_VINCULADO__' } : {}),
      },
      include: {
        staff: { select: { id: true, firstName: true, middleName: true, lastName: true, secondLastName: true, active: true, staffType: true } },
        section: { include: { academicYear: true, studyPlan: true } },
        studyPlanSubject: { include: { subject: true } },
      },
      orderBy: [
        { staff: { lastName: 'asc' } },
        { staff: { firstName: 'asc' } },
        { section: { gradeLevel: 'asc' } },
        { section: { name: 'asc' } },
        { studyPlanSubject: { sortOrder: 'asc' } },
      ],
    }) : [];

    const teacherMap = new Map<string, any>();
    for (const a of assignments) {
      if (!teacherMap.has(a.staff.id)) teacherMap.set(a.staff.id, a.staff);
    }

    const availableTeachers = user?.role === Role.ADMIN
      ? await this.db.staff.findMany({
          where: { active: true, staffType: StaffType.DOCENTE },
          select: { id: true, firstName: true, middleName: true, lastName: true, secondLastName: true },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        })
      : [];

    return {
      userRole: user?.role,
      readOnly: user?.role === Role.SECRETARIA || user?.role === Role.DIRECTOR,
      teacherLinked: user?.role !== Role.DOCENTE || !!staffId,
      currentTeacherId: staffId,
      selectedYearId,
      years,
      teachers: [...teacherMap.values()],
      availableTeachers,
      assignments,
    };
  }

  async workspace(assignmentId: string, lapseId: string, user: any) {
    const assignment = await this.assertAssignmentAccess(assignmentId, user);
    const lapse = await this.db.pedagogicalLapse.findUniqueOrThrow({ where: { id: lapseId } });
    if (lapse.academicYearId !== assignment.section.academicYearId) throw new BadRequestException('El lapso no pertenece al año escolar de la asignación');
    const policy = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: lapse.academicYearId } });
    const students = await this.eligibleEnrollments(assignment.sectionId, assignment.studyPlanSubjectId);
    const enrollmentIds = students.map((s) => s.id);
    const assessments = await this.db.assessment.findMany({
      where: { teacherAssignmentId: assignmentId, lapseId },
      include: { attempts: { where: { enrollmentId: { in: enrollmentIds } } } },
      orderBy: { orderNumber: 'asc' },
    });
    const lapseGrades = enrollmentIds.length ? await this.db.lapseGrade.findMany({
      where: { teacherAssignmentId: assignmentId, lapseId, enrollmentId: { in: enrollmentIds } },
    }) : [];
    const calculationMode = await this.calculationMode(assignmentId, lapseId);
    const percentageTotal = assessments.reduce((acc, a) => acc + Number(a.weight), 0);
    return { assignment, lapse, policy, students, assessments, lapseGrades, calculationMode, percentageTotal };
  }

  private validateAssessmentDates(lapse: any, scheduledAt?: string | Date | null) {
    if (!scheduledAt) throw new BadRequestException('La fecha y hora de la evaluación son obligatorias');
    const parts = assessmentLocalParts(scheduledAt);
    const date = parts.date;
    const start = new Date(lapse.startDate);
    const end = new Date(lapse.endDate);
    end.setUTCHours(23, 59, 59, 999);
    if (date < start || date > end) throw new BadRequestException('La evaluación debe programarse dentro de las fechas del lapso');
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) throw new BadRequestException('Las evaluaciones no pueden programarse sábado ni domingo');
    const minutes = parts.hour * 60 + parts.minute;
    if (minutes < 7 * 60 || minutes > 18 * 60) throw new BadRequestException('La hora de la evaluación debe estar entre las 07:00 a. m. y las 06:00 p. m.');
    return date;
  }

  private async validateAssessmentChronology(teacherAssignmentId: string, lapseId: string, scheduledAt: Date, orderNumber: number, excludeId?: string) {
    const siblings = await this.db.assessment.findMany({
      where: { teacherAssignmentId, lapseId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      orderBy: { orderNumber: 'asc' },
      select: { id: true, orderNumber: true, scheduledAt: true },
    });
    const previous = siblings.filter((a) => a.orderNumber < orderNumber && a.scheduledAt).sort((a, b) => b.orderNumber - a.orderNumber)[0];
    const next = siblings.filter((a) => a.orderNumber > orderNumber && a.scheduledAt).sort((a, b) => a.orderNumber - b.orderNumber)[0];
    if (previous?.scheduledAt && scheduledAt <= previous.scheduledAt) {
      throw new BadRequestException(`La evaluación ${orderNumber} debe tener fecha y hora posterior a la evaluación ${previous.orderNumber}`);
    }
    if (next?.scheduledAt && scheduledAt >= next.scheduledAt) {
      throw new BadRequestException(`La evaluación ${orderNumber} debe tener fecha y hora anterior a la evaluación ${next.orderNumber}`);
    }
  }

  async createAssessment(assignmentId: string, lapseId: string, user: any, data: any) {
    const assignment = await this.assertAssignmentAccess(assignmentId, user);
    this.ensureYearOpen(assignment.section.academicYear.academicClosedAt);
    if (!assignment.active) throw new BadRequestException('La asignación docente está inactiva');
    await this.assertAnnualNotFinalized(assignment);
    const lapse = await this.db.pedagogicalLapse.findUniqueOrThrow({ where: { id: lapseId } });
    if (lapse.academicYearId !== assignment.section.academicYearId) throw new BadRequestException('El lapso no pertenece al año escolar de la asignación');
    this.ensureLapseOpen(lapse);
    const policy = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: lapse.academicYearId } });
    const current = await this.db.assessment.count({ where: { teacherAssignmentId: assignmentId, lapseId } });
    if (current >= policy.evaluationsMax) throw new BadRequestException(`El lapso admite como máximo ${policy.evaluationsMax} evaluaciones`);
    const title = String(data.title || '').trim().toLocaleUpperCase('es-VE');
    const technique = String(data.technique || '').trim().toLocaleUpperCase('es-VE');
    const instrument = String(data.instrument || '').trim().toLocaleUpperCase('es-VE');
    const objective = parseObjective(data.objective);
    if (!title || !technique || !instrument) throw new BadRequestException('Contenido evaluado, técnica e instrumento son obligatorios');
    const repeatedObjective = await this.db.assessment.findFirst({ where: { teacherAssignmentId: assignmentId, objective } });
    if (repeatedObjective) throw new BadRequestException(`El objetivo ${objective} ya está registrado en otra evaluación de esta materia durante este año escolar`);
    const calculationMode = await this.calculationMode(assignmentId, lapseId);
    const weight = calculationMode === GradingCalculationMode.PERCENTUAL ? Number(data.weight) : 1;
    if (calculationMode === GradingCalculationMode.PERCENTUAL && (!Number.isFinite(weight) || weight <= 0 || weight > 100)) {
      throw new BadRequestException('En modalidad PORCENTUAL, la ponderación de cada evaluación debe ser mayor que 0 y no superar 100%');
    }
    const scheduledAt = this.validateAssessmentDates(lapse, data.scheduledAt);
    const orderNumber = current + 1;
    await this.validateAssessmentChronology(assignmentId, lapseId, scheduledAt, orderNumber);
    return this.db.assessment.create({
      data: { teacherAssignmentId: assignmentId, lapseId, title, objective, technique, instrument, weight, scheduledAt, orderNumber },
    });
  }

  async updateAssessment(assessmentId: string, user: any, data: any) {
    const current = await this.db.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      include: { lapse: true, teacherAssignment: { include: { section: { include: { academicYear: true } } } }, _count: { select: { attempts: true } } },
    });
    await this.assertAssignmentAccess(current.teacherAssignmentId, user);
    this.ensureYearOpen(current.teacherAssignment.section.academicYear.academicClosedAt);
    this.ensureLapseOpen(current.lapse);
    await this.assertAnnualNotFinalized(current.teacherAssignment);
    const title = String(data.title ?? current.title).trim().toLocaleUpperCase('es-VE');
    const technique = String(data.technique ?? current.technique ?? '').trim().toLocaleUpperCase('es-VE');
    const instrument = String(data.instrument ?? current.instrument ?? '').trim().toLocaleUpperCase('es-VE');
    const objective = parseObjective(data.objective ?? current.objective);
    if (!title || !technique || !instrument) throw new BadRequestException('Contenido evaluado, técnica e instrumento son obligatorios');
    const repeatedObjective = await this.db.assessment.findFirst({ where: { teacherAssignmentId: current.teacherAssignmentId, objective, id: { not: assessmentId } } });
    if (repeatedObjective) throw new BadRequestException(`El objetivo ${objective} ya está registrado en otra evaluación de esta materia durante este año escolar`);
    const calculationMode = await this.calculationMode(current.teacherAssignmentId, current.lapseId);
    const weight = calculationMode === GradingCalculationMode.PERCENTUAL
      ? (data.weight === undefined ? Number(current.weight) : Number(data.weight))
      : 1;
    if (calculationMode === GradingCalculationMode.PERCENTUAL && (!Number.isFinite(weight) || weight <= 0 || weight > 100)) {
      throw new BadRequestException('En modalidad PORCENTUAL, la ponderación de cada evaluación debe ser mayor que 0 y no superar 100%');
    }
    const scheduledAt = this.validateAssessmentDates(current.lapse, data.scheduledAt ?? current.scheduledAt);
    await this.validateAssessmentChronology(current.teacherAssignmentId, current.lapseId, scheduledAt, current.orderNumber, assessmentId);
    return this.db.assessment.update({ where: { id: assessmentId }, data: { title, objective, technique, instrument, weight, scheduledAt } });
  }

  async updatePendingObjective(assessmentId: string, user: any, data: any) {
    const current = await this.db.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      include: { lapse: true, teacherAssignment: { include: { section: { include: { academicYear: true } } } } },
    });
    await this.assertAssignmentAccess(current.teacherAssignmentId, user);
    this.ensureYearOpen(current.teacherAssignment.section.academicYear.academicClosedAt);
    await this.assertAnnualNotFinalized(current.teacherAssignment);

    if (current.objective !== null && current.objective !== undefined) {
      throw new BadRequestException('Esta evaluación ya posee un objetivo. Use la edición normal para modificarla.');
    }

    // El ADMINISTRADOR puede reparar evaluaciones heredadas con objetivo pendiente aun si el lapso está inactivo.
    // El DOCENTE responsable mantiene la regla normal: solo puede hacerlo cuando el lapso está activo.
    if (user?.role === Role.DOCENTE) this.ensureLapseOpen(current.lapse);

    const objective = parseObjective(data?.objective);
    const repeatedObjective = await this.db.assessment.findFirst({
      where: { teacherAssignmentId: current.teacherAssignmentId, objective, id: { not: assessmentId } },
    });
    if (repeatedObjective) {
      throw new BadRequestException(`El objetivo ${objective} ya está registrado en otra evaluación de esta materia durante este año escolar`);
    }

    return this.db.assessment.update({ where: { id: assessmentId }, data: { objective } });
  }

  async deleteAssessment(assessmentId: string, user: any) {
    const current = await this.db.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      include: { lapse: true, teacherAssignment: { include: { section: { include: { academicYear: true } } } }, _count: { select: { attempts: true } } },
    });
    await this.assertAssignmentAccess(current.teacherAssignmentId, user);
    this.ensureYearOpen(current.teacherAssignment.section.academicYear.academicClosedAt);
    this.ensureLapseOpen(current.lapse);
    await this.assertAnnualNotFinalized(current.teacherAssignment);
    if (current._count.attempts > 0) throw new BadRequestException('No se puede eliminar una evaluación que ya tiene calificaciones registradas');
    const closed = await this.db.lapseGrade.count({ where: { teacherAssignmentId: current.teacherAssignmentId, lapseId: current.lapseId } });
    if (closed > 0) throw new BadRequestException('No se puede eliminar una evaluación después de cerrar calificaciones del lapso');
    await this.db.assessment.delete({ where: { id: assessmentId } });
    const remaining = await this.db.assessment.findMany({ where: { teacherAssignmentId: current.teacherAssignmentId, lapseId: current.lapseId }, orderBy: { orderNumber: 'asc' } });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].orderNumber !== i + 1) await this.db.assessment.update({ where: { id: remaining[i].id }, data: { orderNumber: i + 1 } });
    }
    return { ok: true };
  }

  async saveAttempt(assessmentId: string, enrollmentId: string, form: AssessmentForm, data: any, user?: any) {
    const assessment = await this.db.assessment.findUniqueOrThrow({ where: { id: assessmentId }, include: { lapse: true, teacherAssignment: { include: { section: { include: { academicYear: true } } } } } });
    if (user) await this.assertAssignmentAccess(assessment.teacherAssignmentId, user);
    this.ensureYearOpen(assessment.teacherAssignment.section.academicYear.academicClosedAt);
    this.ensureLapseOpen(assessment.lapse);
    if (!assessment.teacherAssignment.active) throw new BadRequestException('La asignación docente está inactiva');
    await this.assertAnnualNotFinalized(assessment.teacherAssignment);
    const enrollment = await this.db.enrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: { curriculumSubjects: { where: { active: true } } } });
    if (enrollment.sectionId !== assessment.teacherAssignment.sectionId) throw new BadRequestException('El estudiante no pertenece a esta sección');
    if (enrollment.curriculumSubjects.length && !enrollment.curriculumSubjects.some((x) => x.studyPlanSubjectId === assessment.teacherAssignment.studyPlanSubjectId)) throw new BadRequestException('La materia no forma parte de las asignaturas activas de esta matrícula');
    const policy = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: enrollment.academicYearId } });
    if (form === AssessmentForm.SEGUNDA) {
      const first = await this.db.assessmentAttempt.findUnique({ where: { assessmentId_enrollmentId_form: { assessmentId, enrollmentId, form: AssessmentForm.PRIMERA } } });
      if (!first) throw new BadRequestException('Debe existir primera forma');
      if (first.attendance === AttendanceStatus.INASISTENTE) throw new BadRequestException('Inasistente en primera forma: no tiene derecho a segunda forma');
      if (first.score !== null && Number(first.score) >= Number(policy.passingScore)) throw new BadRequestException('Ya aprobó la primera forma');
    }
    const attendance = data.attendance === AttendanceStatus.INASISTENTE ? AttendanceStatus.INASISTENTE : AttendanceStatus.PRESENTE;
    let score: number | null = null;
    let status: AttemptStatus = AttemptStatus.INASISTENTE;
    if (attendance === AttendanceStatus.PRESENTE) {
      if (data.score === '' || data.score === null || data.score === undefined) throw new BadRequestException('La calificación es obligatoria cuando el estudiante está PRESENTE');
      score = Number(data.score);
      const maxAllowed = Math.min(Number(policy.maxScore), 20);
      if (!Number.isFinite(score) || score < 1 || score > maxAllowed) throw new BadRequestException(`La calificación debe estar entre 01 y ${maxAllowed}`);
      status = AttemptStatus.PRESENTADA;
    }
    const payload: any = {
      attendance,
      score,
      status,
      notes: upper(data.notes) || null,
      technique: upper(data.technique) || null,
      instrument: upper(data.instrument) || null,
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
    };
    return this.db.assessmentAttempt.upsert({ where: { assessmentId_enrollmentId_form: { assessmentId, enrollmentId, form } }, update: payload, create: { assessmentId, enrollmentId, form, ...payload } });
  }

  async saveBulkAttempts(assessmentId: string, form: AssessmentForm, user: any, rows: any[]) {
    const assessment = await this.db.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      include: { lapse: true, teacherAssignment: { include: { section: { include: { academicYear: true } } } } },
    });
    await this.assertAssignmentAccess(assessment.teacherAssignmentId, user);
    this.ensureYearOpen(assessment.teacherAssignment.section.academicYear.academicClosedAt);
    this.ensureLapseOpen(assessment.lapse);
    if (!assessment.teacherAssignment.active) throw new BadRequestException('La asignación docente está inactiva');
    await this.assertAnnualNotFinalized(assessment.teacherAssignment);
    const policy = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: assessment.teacherAssignment.section.academicYearId } });
    const eligible = await this.eligibleEnrollments(assessment.teacherAssignment.sectionId, assessment.teacherAssignment.studyPlanSubjectId);
    const eligibleIds = new Set(eligible.map((e) => e.id));
    const firstMap = new Map<string, any>();
    if (form === AssessmentForm.SEGUNDA) {
      const firsts = await this.db.assessmentAttempt.findMany({ where: { assessmentId, form: AssessmentForm.PRIMERA, enrollmentId: { in: rows.map((r) => r.enrollmentId) } } });
      for (const first of firsts) firstMap.set(first.enrollmentId, first);
    }
    const ops: any[] = [];
    for (const row of rows || []) {
      const enrollmentId = String(row.enrollmentId || '');
      if (!eligibleIds.has(enrollmentId)) throw new BadRequestException('Uno de los estudiantes no pertenece a la nómina activa de esta asignación');
      if (form === AssessmentForm.SEGUNDA) {
        const first = firstMap.get(enrollmentId);
        if (!first) throw new BadRequestException('Debe guardar la primera forma antes de registrar la segunda');
        if (first.attendance === AttendanceStatus.INASISTENTE) throw new BadRequestException('Un estudiante inasistente en primera forma no tiene derecho a segunda forma');
        if (first.score !== null && Number(first.score) >= Number(policy.passingScore)) throw new BadRequestException('Un estudiante que aprobó primera forma no puede presentar segunda forma');
      }
      const attendance = row.attendance === AttendanceStatus.INASISTENTE ? AttendanceStatus.INASISTENTE : AttendanceStatus.PRESENTE;
      let score: number | null = null;
      let status: AttemptStatus = AttemptStatus.INASISTENTE;
      if (attendance === AttendanceStatus.PRESENTE) {
        if (row.score === '' || row.score === null || row.score === undefined) throw new BadRequestException('Todas las calificaciones de estudiantes PRESENTES son obligatorias');
        score = Number(row.score);
        const maxAllowed = Math.min(Number(policy.maxScore), 20);
        if (!Number.isFinite(score) || score < 1 || score > maxAllowed) throw new BadRequestException(`Todas las calificaciones de estudiantes PRESENTES deben estar entre 01 y ${maxAllowed}`);
        status = AttemptStatus.PRESENTADA;
      }
      const payload: any = { attendance, score, status, notes: upper(row.notes) || null, appliedAt: new Date() };
      ops.push(this.db.assessmentAttempt.upsert({
        where: { assessmentId_enrollmentId_form: { assessmentId, enrollmentId, form } },
        update: payload,
        create: { assessmentId, enrollmentId, form, ...payload },
      }));
    }
    if (ops.length) await this.db.$transaction(ops);
    return { ok: true, saved: ops.length };
  }

  private effectiveAttemptScore(first: any, second: any) {
    if (!first) return { ready: false, score: null, reason: 'SIN PRIMERA FORMA' };
    if (first.attendance === AttendanceStatus.INASISTENTE) return { ready: true, score: 0, reason: 'INASISTENTE' };
    if (first.score === null) return { ready: false, score: null, reason: 'PRIMERA FORMA SIN NOTA' };
    if (second?.status === AttemptStatus.PRESENTADA && second.score !== null) return { ready: true, score: Number(second.score), reason: 'SEGUNDA FORMA' };
    return { ready: true, score: Number(first.score), reason: 'PRIMERA FORMA' };
  }

  async closeLapse(enrollmentId: string, teacherAssignmentId: string, lapseId: string, user: any) {
    await this.assertAssignmentAccess(teacherAssignmentId, user);
    const workspace = await this.workspace(teacherAssignmentId, lapseId, user);
    const student = workspace.students.find((s: any) => s.id === enrollmentId);
    if (!student) throw new BadRequestException('El estudiante no forma parte de esta asignación');
    return this.closeOneStudentLapse(workspace, student);
  }

  private validateLapseCalculation(workspace: any) {
    const { policy, assessments, calculationMode } = workspace;
    if (assessments.length < policy.evaluationsMin || assessments.length > policy.evaluationsMax) {
      throw new BadRequestException(`El lapso debe tener entre ${policy.evaluationsMin} y ${policy.evaluationsMax} evaluaciones`);
    }
    const withoutObjective = assessments.filter((a: any) => a.objective === null || a.objective === undefined);
    if (withoutObjective.length) {
      throw new BadRequestException('Todas las evaluaciones deben tener un objetivo numérico antes de calcular la definitiva del lapso');
    }
    if (calculationMode === GradingCalculationMode.PERCENTUAL) {
      const total = assessments.reduce((acc: number, a: any) => acc + Number(a.weight), 0);
      if (Math.abs(total - 100) > 0.001) {
        throw new BadRequestException(`No se puede cerrar el lapso: la ponderación PORCENTUAL debe sumar exactamente 100%. Actualmente suma ${round2(total)}%.`);
      }
    }
  }

  private studentLapseScore(workspace: any, student: any) {
    const { assessments, calculationMode } = workspace;
    let accumulated = 0;
    for (const assessment of assessments) {
      const first = assessment.attempts.find((x: any) => x.enrollmentId === student.id && x.form === AssessmentForm.PRIMERA);
      const second = assessment.attempts.find((x: any) => x.enrollmentId === student.id && x.form === AssessmentForm.SEGUNDA);
      const effective = this.effectiveAttemptScore(first, second);
      if (!effective.ready) {
        throw new BadRequestException(`${student.student.firstName} ${student.student.lastName}: ${assessment.title} (${effective.reason})`);
      }
      if (calculationMode === GradingCalculationMode.PERCENTUAL) {
        accumulated += Number(effective.score) * (Number(assessment.weight) / 100);
      } else {
        accumulated += Number(effective.score);
      }
    }
    if (calculationMode === GradingCalculationMode.PERCENTUAL) return round2(accumulated);
    return Math.round(accumulated / assessments.length);
  }

  private async closeOneStudentLapse(workspace: any, student: any) {
    const { assignment, lapse } = workspace;
    this.ensureLapseOpen(lapse);
    this.validateLapseCalculation(workspace);
    const score = this.studentLapseScore(workspace, student);
    return this.db.lapseGrade.upsert({
      where: { enrollmentId_teacherAssignmentId_lapseId: { enrollmentId: student.id, teacherAssignmentId: assignment.id, lapseId: lapse.id } },
      update: { score, closedAt: new Date() },
      create: { enrollmentId: student.id, teacherAssignmentId: assignment.id, lapseId: lapse.id, score, closedAt: new Date() },
    });
  }

  async closeAllLapse(assignmentId: string, lapseId: string, user: any) {
    const assignment = await this.assertAssignmentAccess(assignmentId, user);
    this.ensureYearOpen(assignment.section.academicYear.academicClosedAt);
    await this.assertAnnualNotFinalized(assignment);
    const workspace = await this.workspace(assignmentId, lapseId, user);
    this.ensureLapseOpen(workspace.lapse);
    this.validateLapseCalculation(workspace);

    const rows: { enrollmentId: string; score: number }[] = [];
    const errors: string[] = [];
    for (const student of workspace.students) {
      try {
        rows.push({ enrollmentId: student.id, score: this.studentLapseScore(workspace, student) });
      } catch (error: any) {
        errors.push(error?.message || `${student.student.firstName} ${student.student.lastName}: no se pudo calcular`);
      }
    }
    if (errors.length) {
      throw new BadRequestException(`No se puede calcular la definitiva del lapso. ${errors.slice(0, 8).join(' · ')}${errors.length > 8 ? ` · y ${errors.length - 8} caso(s) más` : ''}`);
    }

    const ops = rows.map((r) => this.db.lapseGrade.upsert({
      where: { enrollmentId_teacherAssignmentId_lapseId: { enrollmentId: r.enrollmentId, teacherAssignmentId: assignmentId, lapseId } },
      update: { score: r.score, closedAt: new Date() },
      create: { enrollmentId: r.enrollmentId, teacherAssignmentId: assignmentId, lapseId, score: r.score, closedAt: new Date() },
    }));
    if (ops.length) await this.db.$transaction(ops);
    return { ok: true, closed: rows.length, rows, calculationMode: workspace.calculationMode };
  }

  orientationLetter(score: number, policy: any) {
    return score >= Number(policy.orientationAmin) ? 'A' : score >= Number(policy.orientationBmin) ? 'B' : score >= Number(policy.orientationCmin) ? 'C' : 'D';
  }

  async finalizeAnnual(enrollmentId: string, studyPlanSubjectId: string, numericScore: number) {
    const e = await this.db.enrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: { curriculumSubjects: { where: { active: true } }, academicYear: true } });
    this.ensureYearOpen(e.academicYear.academicClosedAt);
    if (e.curriculumSubjects.length && !e.curriculumSubjects.some((x) => x.studyPlanSubjectId === studyPlanSubjectId)) throw new BadRequestException('No puede registrar definitiva de una materia que el estudiante no cursa en esta matrícula');
    const p = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: e.academicYearId } });
    const maxAllowed = Math.min(Number(p.maxScore), 20);
    if (!Number.isFinite(numericScore) || numericScore < 1 || numericScore > maxAllowed) throw new BadRequestException(`La definitiva manual debe estar entre 01 y ${maxAllowed}`);
    const sps = await this.db.studyPlanSubject.findUniqueOrThrow({ where: { id: studyPlanSubjectId }, include: { subject: true } });
    const status = numericScore >= Number(p.passingScore) ? ResultStatus.APROBADO : ResultStatus.REPROBADO;
    const letter = sps.subject.gradingType === 'ORIENTATION_LETTER' ? this.orientationLetter(numericScore, p) : null;
    return this.db.annualSubjectResult.upsert({ where: { enrollmentId_studyPlanSubjectId: { enrollmentId, studyPlanSubjectId } }, update: { numericScore, letterScore: letter, status, finalizedAt: new Date() }, create: { enrollmentId, studyPlanSubjectId, numericScore, letterScore: letter, status } });
  }

  private async tryRecomputeCondition(enrollmentId: string) {
    const e = await this.db.enrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: { annualResults: true, studyPlan: true, curriculumSubjects: { where: { active: true } } } });
    if (e.condition === StudentCondition.RETIRADO || e.condition === StudentCondition.RETIRADO_MODIFICADO || e.condition === StudentCondition.INACTIVO || e.condition === StudentCondition.GRADUADO) return null;
    let expectedIds = e.curriculumSubjects.filter((x) => x.origin !== EnrollmentSubjectOrigin.MATERIA_PENDIENTE).map((x) => x.studyPlanSubjectId);
    if (!expectedIds.length) {
      const planSubjects = await this.db.studyPlanSubject.findMany({ where: { studyPlanId: e.studyPlanId, gradeLevel: e.gradeLevel, active: true }, select: { id: true } });
      expectedIds = planSubjects.map((x) => x.id);
    }
    const map = new Map<string, any>(e.annualResults.map((r: any): [string, any] => [r.studyPlanSubjectId, r]));
    if (expectedIds.some((id) => !map.has(id) || map.get(id)?.status === ResultStatus.PENDIENTE)) return null;
    const failed = expectedIds.filter((id) => map.get(id)?.status === ResultStatus.REPROBADO).length;
    const p = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: e.academicYearId } });
    const decision = deriveAcademicDecision({ gradeLevel: e.gradeLevel, maxGrade: e.studyPlan.maxGrade, failedCount: failed, pendingMaxSubjects: p.pendingMaxSubjects });
    return this.db.enrollment.update({ where: { id: enrollmentId }, data: { condition: decision.condition, academicCondition: decision.condition, academicOutcomeFinalizedAt: new Date() } });
  }

  async recomputeCondition(enrollmentId: string) {
    const result = await this.tryRecomputeCondition(enrollmentId);
    if (!result) throw new BadRequestException('La definitiva no está completa para todas las materias que cursa el estudiante');
    return result;
  }

  async annualWorkspace(assignmentId: string, user: any) {
    const assignment = await this.assertAssignmentAccess(assignmentId, user);
    const policy = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: assignment.section.academicYearId } });
    const lapses = await this.db.pedagogicalLapse.findMany({ where: { academicYearId: assignment.section.academicYearId }, orderBy: { number: 'asc' } });
    const students = await this.eligibleEnrollments(assignment.sectionId, assignment.studyPlanSubjectId);
    const ids = students.map((s) => s.id);
    const lapseGrades = ids.length ? await this.db.lapseGrade.findMany({ where: { teacherAssignmentId: assignmentId, enrollmentId: { in: ids } } }) : [];
    const annualResults = ids.length ? await this.db.annualSubjectResult.findMany({ where: { studyPlanSubjectId: assignment.studyPlanSubjectId, enrollmentId: { in: ids } } }) : [];
    const rows = students.map((student) => {
      const grades = lapses.map((l) => lapseGrades.find((g) => g.enrollmentId === student.id && g.lapseId === l.id)?.score ?? null);
      const complete = grades.length === policy.lapseCount && grades.every((g) => g !== null);
      const suggestedScore = complete ? round2(grades.reduce((acc, g) => acc + Number(g), 0) / grades.length) : null;
      const annual = annualResults.find((r) => r.enrollmentId === student.id) || null;
      return { student, grades, suggestedScore, annual };
    });
    return { assignment, policy, lapses, rows, note: 'El promedio de los lapsos se presenta como sugerencia. La definitiva solo se guarda cuando el docente la confirma.' };
  }

  async confirmAnnual(assignmentId: string, user: any, rows: any[]) {
    const assignment = await this.assertAssignmentAccess(assignmentId, user);
    this.ensureYearOpen(assignment.section.academicYear.academicClosedAt);
    const annual = await this.annualWorkspace(assignmentId, user);
    const allowed = new Map(annual.rows.map((r: any) => [r.student.id, r]));
    const saved: any[] = [];
    for (const row of rows || []) {
      const context: any = allowed.get(row.enrollmentId);
      if (!context) throw new BadRequestException('Uno de los estudiantes no pertenece a la asignación');
      if (context.suggestedScore === null) throw new BadRequestException(`No se puede registrar definitiva de ${context.student.student.firstName} ${context.student.student.lastName}: faltan lapsos por cerrar`);
      saved.push(await this.finalizeAnnual(row.enrollmentId, assignment.studyPlanSubjectId, Number(row.numericScore)));
    }
    let conditions = 0;
    for (const row of rows || []) if (await this.tryRecomputeCondition(row.enrollmentId)) conditions++;
    return { ok: true, saved: saved.length, academicConditionsFinalized: conditions };
  }

  async setLapseActive(lapseId: string, active: boolean) {
    const lapse = await this.db.pedagogicalLapse.findUniqueOrThrow({
      where: { id: lapseId },
      include: { academicYear: true },
    });
    this.ensureYearOpen(lapse.academicYear.academicClosedAt);
    return this.db.pedagogicalLapse.update({
      where: { id: lapseId },
      data: { status: active ? LapseStatus.OPEN : LapseStatus.PLANNED },
    });
  }

  async setCalculationMode(assignmentId: string, lapseId: string, user: any, mode: GradingCalculationMode) {
    const assignment = await this.assertAssignmentAccess(assignmentId, user);
    this.ensureYearOpen(assignment.section.academicYear.academicClosedAt);
    await this.assertAnnualNotFinalized(assignment);
    const lapse = await this.db.pedagogicalLapse.findUniqueOrThrow({ where: { id: lapseId } });
    if (lapse.academicYearId !== assignment.section.academicYearId) {
      throw new BadRequestException('El lapso no pertenece al año escolar de la asignación');
    }
    this.ensureLapseOpen(lapse);
    if (![GradingCalculationMode.PERCENTUAL, GradingCalculationMode.ACUMULATIVA].includes(mode)) {
      throw new BadRequestException('Método de cálculo no válido');
    }
    return this.db.assignmentLapseConfig.upsert({
      where: { teacherAssignmentId_lapseId: { teacherAssignmentId: assignmentId, lapseId } },
      update: { calculationMode: mode },
      create: { teacherAssignmentId: assignmentId, lapseId, calculationMode: mode },
    });
  }

  async reassignTeacher(assignmentId: string, newStaffId: string, user: any) {
    const assignment = await this.db.teacherAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        staff: true,
        section: { include: { academicYear: true, studyPlan: true } },
        studyPlanSubject: { include: { subject: true } },
      },
    });
    this.ensureYearOpen(assignment.section.academicYear.academicClosedAt);

    const target = await this.db.staff.findUniqueOrThrow({ where: { id: newStaffId } });
    if (!target.active || target.staffType !== StaffType.DOCENTE) {
      throw new BadRequestException('El nuevo responsable debe ser personal DOCENTE activo');
    }
    if (assignment.staffId === newStaffId) return assignment;

    const conflict = await this.db.teacherAssignment.findUnique({
      where: {
        staffId_sectionId_studyPlanSubjectId: {
          staffId: newStaffId,
          sectionId: assignment.sectionId,
          studyPlanSubjectId: assignment.studyPlanSubjectId,
        },
      },
      include: { _count: { select: { assessments: true, lapseGrades: true } } },
    });
    if (conflict && conflict.id !== assignmentId) {
      if (conflict._count.assessments > 0 || conflict._count.lapseGrades > 0) {
        throw new BadRequestException('El docente seleccionado ya posee una asignación histórica de esta misma materia/sección con notas. No puede fusionarse automáticamente.');
      }
      await this.db.teacherAssignment.delete({ where: { id: conflict.id } });
    }

    const updated = await this.db.teacherAssignment.update({
      where: { id: assignmentId },
      data: { staffId: newStaffId, active: true, assignedAt: new Date() },
      include: {
        staff: true,
        section: { include: { academicYear: true, studyPlan: true } },
        studyPlanSubject: { include: { subject: true } },
      },
    });

    await this.db.auditLog.create({
      data: {
        userId: user?.sub || null,
        action: 'CAMBIO_DOCENTE_ASIGNACION',
        entity: 'TeacherAssignment',
        entityId: assignmentId,
        metadata: {
          fromStaffId: assignment.staffId,
          fromStaffName: `${assignment.staff.firstName} ${assignment.staff.lastName}`,
          toStaffId: newStaffId,
          toStaffName: `${target.firstName} ${target.lastName}`,
          subject: assignment.studyPlanSubject.subject.name,
          section: `${assignment.section.gradeLevel}° ${assignment.section.name}`,
          academicYear: assignment.section.academicYear.name,
        },
      },
    });
    return updated;
  }

  async updatePolicy(academicYearId: string, data: any) {
    const year = await this.db.academicYear.findUniqueOrThrow({ where: { id: academicYearId } });
    this.ensureYearOpen(year.academicClosedAt);
    const maxScore = Number(data.maxScore);
    const passingScore = Number(data.passingScore);
    const evaluationsMin = Number(data.evaluationsMin);
    const evaluationsMax = Number(data.evaluationsMax);
    if (!Number.isFinite(maxScore) || maxScore <= 0) throw new BadRequestException('La nota máxima debe ser mayor que cero');
    if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > maxScore) throw new BadRequestException('La nota mínima aprobatoria debe estar dentro de la escala');
    if (!Number.isInteger(evaluationsMin) || evaluationsMin < 2 || evaluationsMin > 5) throw new BadRequestException('El mínimo de evaluaciones debe estar entre 2 y 5');
    if (!Number.isInteger(evaluationsMax) || evaluationsMax < evaluationsMin || evaluationsMax > 5) throw new BadRequestException('El máximo de evaluaciones debe estar entre el mínimo y 5');
    return this.db.gradingPolicy.update({ where: { academicYearId }, data: { maxScore, passingScore, evaluationsMin, evaluationsMax } });
  }

  pending(enrollmentId?: string) {
    return this.db.pendingSubject.findMany({ where: { enrollmentId }, include: { studyPlanSubject: { include: { subject: true } }, opportunities: { include: { attempts: true } }, reviewAttempts: true, enrollment: { include: { student: true, section: true } } } });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grading')
export class GradingController {
  constructor(private s: GradingService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE, Role.SECRETARIA)
  @Get('context')
  context(@CurrentUser() user: any, @Query('academicYearId') year?: string) { return this.s.context(user, year); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE, Role.SECRETARIA)
  @Get('assignments/:assignmentId/lapses/:lapseId')
  workspace(@Param('assignmentId') a: string, @Param('lapseId') l: string, @CurrentUser() user: any) { return this.s.workspace(a, l, user); }

  @Roles(Role.ADMIN)
  @Patch('lapses/:lapseId/active')
  lapseActive(@Param('lapseId') lapseId: string, @Body('active') active: boolean) {
    return this.s.setLapseActive(lapseId, !!active);
  }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Patch('assignments/:assignmentId/lapses/:lapseId/calculation-mode')
  calculationMode(
    @Param('assignmentId') assignmentId: string,
    @Param('lapseId') lapseId: string,
    @Body('calculationMode') calculationMode: GradingCalculationMode,
    @CurrentUser() user: any,
  ) {
    return this.s.setCalculationMode(assignmentId, lapseId, user, calculationMode);
  }

  @Roles(Role.ADMIN)
  @Patch('assignments/:assignmentId/teacher')
  reassignTeacher(
    @Param('assignmentId') assignmentId: string,
    @Body('staffId') staffId: string,
    @CurrentUser() user: any,
  ) {
    return this.s.reassignTeacher(assignmentId, staffId, user);
  }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Post('assignments/:assignmentId/lapses/:lapseId/assessments')
  createAssessment(@Param('assignmentId') a: string, @Param('lapseId') l: string, @CurrentUser() user: any, @Body() d: any) { return this.s.createAssessment(a, l, user, d); }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Patch('assessments/:assessmentId/objective')
  updatePendingObjective(@Param('assessmentId') a: string, @CurrentUser() user: any, @Body() d: any) {
    return this.s.updatePendingObjective(a, user, d);
  }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Patch('assessments/:assessmentId')
  updateAssessment(@Param('assessmentId') a: string, @CurrentUser() user: any, @Body() d: any) { return this.s.updateAssessment(a, user, d); }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Delete('assessments/:assessmentId')
  deleteAssessment(@Param('assessmentId') a: string, @CurrentUser() user: any) { return this.s.deleteAssessment(a, user); }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Post('assessments/:assessmentId/students/:enrollmentId/:form')
  attempt(@Param('assessmentId') a: string, @Param('enrollmentId') e: string, @Param('form') f: AssessmentForm, @Body() d: any, @CurrentUser() user: any) { return this.s.saveAttempt(a, e, f, d, user); }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Post('assessments/:assessmentId/bulk/:form')
  bulk(@Param('assessmentId') a: string, @Param('form') f: AssessmentForm, @CurrentUser() user: any, @Body('rows') rows: any[]) { return this.s.saveBulkAttempts(a, f, user, rows); }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Post('lapses/:lapseId/assignments/:assignmentId/students/:enrollmentId/close')
  close(@Param('enrollmentId') e: string, @Param('assignmentId') a: string, @Param('lapseId') l: string, @CurrentUser() user: any) { return this.s.closeLapse(e, a, l, user); }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Post('assignments/:assignmentId/lapses/:lapseId/close-all')
  closeAll(@Param('assignmentId') a: string, @Param('lapseId') l: string, @CurrentUser() user: any) { return this.s.closeAllLapse(a, l, user); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE, Role.SECRETARIA)
  @Get('assignments/:assignmentId/annual')
  annualWorkspace(@Param('assignmentId') a: string, @CurrentUser() user: any) { return this.s.annualWorkspace(a, user); }

  @Roles(Role.ADMIN, Role.DOCENTE)
  @Post('assignments/:assignmentId/annual/confirm')
  annualConfirm(@Param('assignmentId') a: string, @CurrentUser() user: any, @Body('rows') rows: any[]) { return this.s.confirmAnnual(a, user, rows); }

  @Roles(Role.ADMIN)
  @Post('annual/:studyPlanSubjectId/students/:enrollmentId')
  annual(@Param('enrollmentId') e: string, @Param('studyPlanSubjectId') sps: string, @Body('numericScore') score: number) { return this.s.finalizeAnnual(e, sps, Number(score)); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('students/:enrollmentId/recompute-condition')
  condition(@Param('enrollmentId') e: string) { return this.s.recomputeCondition(e); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch('years/:academicYearId/policy')
  policy(@Param('academicYearId') id: string, @Body() d: any) { return this.s.updatePolicy(id, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE, Role.SECRETARIA)
  @Get('pending')
  pending(@Query('enrollmentId') e?: string) { return this.s.pending(e); }
}
