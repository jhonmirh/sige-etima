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
  LapseStatus,
  ResultStatus,
  Role,
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
        staff: { select: { id: true, firstName: true, middleName: true, lastName: true, secondLastName: true } },
        section: { include: { academicYear: true, studyPlan: true } },
        studyPlanSubject: { include: { subject: true } },
      },
      orderBy: [
        { section: { gradeLevel: 'asc' } },
        { section: { name: 'asc' } },
        { studyPlanSubject: { sortOrder: 'asc' } },
      ],
    }) : [];
    return {
      userRole: user?.role,
      readOnly: user?.role === Role.SECRETARIA,
      teacherLinked: user?.role !== Role.DOCENTE || !!staffId,
      selectedYearId,
      years,
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
    return { assignment, lapse, policy, students, assessments, lapseGrades };
  }

  private validateAssessmentDates(lapse: any, scheduledAt?: string | Date | null) {
    if (!scheduledAt) throw new BadRequestException('La fecha y hora de la evaluación son obligatorias');
    const date = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('La fecha de evaluación no es válida');
    const start = new Date(lapse.startDate);
    const end = new Date(lapse.endDate);
    end.setHours(23, 59, 59, 999);
    if (date < start || date > end) throw new BadRequestException('La evaluación debe programarse dentro de las fechas del lapso');
    return date;
  }

  async createAssessment(assignmentId: string, lapseId: string, user: any, data: any) {
    const assignment = await this.assertAssignmentAccess(assignmentId, user);
    this.ensureYearOpen(assignment.section.academicYear.academicClosedAt);
    if (!assignment.active) throw new BadRequestException('La asignación docente está inactiva');
    await this.assertAnnualNotFinalized(assignment);
    const lapse = await this.db.pedagogicalLapse.findUniqueOrThrow({ where: { id: lapseId } });
    if (lapse.academicYearId !== assignment.section.academicYearId) throw new BadRequestException('El lapso no pertenece al año escolar de la asignación');
    const policy = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: lapse.academicYearId } });
    const current = await this.db.assessment.count({ where: { teacherAssignmentId: assignmentId, lapseId } });
    if (current >= policy.evaluationsMax) throw new BadRequestException(`El lapso admite como máximo ${policy.evaluationsMax} evaluaciones`);
    const title = String(data.title || '').trim().toLocaleUpperCase('es-VE');
    const technique = String(data.technique || '').trim().toLocaleUpperCase('es-VE');
    const instrument = String(data.instrument || '').trim().toLocaleUpperCase('es-VE');
    if (!title || !technique || !instrument) throw new BadRequestException('Título, técnica e instrumento son obligatorios');
    const weight = Number(data.weight);
    if (!Number.isFinite(weight) || weight <= 0) throw new BadRequestException('La ponderación debe ser mayor que cero');
    const scheduledAt = this.validateAssessmentDates(lapse, data.scheduledAt);
    const orderNumber = current + 1;
    await this.db.pedagogicalLapse.update({ where: { id: lapseId }, data: { status: LapseStatus.OPEN } });
    return this.db.assessment.create({
      data: { teacherAssignmentId: assignmentId, lapseId, title, technique, instrument, weight, scheduledAt, orderNumber },
    });
  }

  async updateAssessment(assessmentId: string, user: any, data: any) {
    const current = await this.db.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      include: { lapse: true, teacherAssignment: { include: { section: { include: { academicYear: true } } } }, _count: { select: { attempts: true } } },
    });
    await this.assertAssignmentAccess(current.teacherAssignmentId, user);
    this.ensureYearOpen(current.teacherAssignment.section.academicYear.academicClosedAt);
    await this.assertAnnualNotFinalized(current.teacherAssignment);
    const title = String(data.title ?? current.title).trim().toLocaleUpperCase('es-VE');
    const technique = String(data.technique ?? current.technique ?? '').trim().toLocaleUpperCase('es-VE');
    const instrument = String(data.instrument ?? current.instrument ?? '').trim().toLocaleUpperCase('es-VE');
    if (!title || !technique || !instrument) throw new BadRequestException('Título, técnica e instrumento son obligatorios');
    const weight = data.weight === undefined ? Number(current.weight) : Number(data.weight);
    if (!Number.isFinite(weight) || weight <= 0) throw new BadRequestException('La ponderación debe ser mayor que cero');
    const scheduledAt = this.validateAssessmentDates(current.lapse, data.scheduledAt ?? current.scheduledAt);
    return this.db.assessment.update({ where: { id: assessmentId }, data: { title, technique, instrument, weight, scheduledAt } });
  }

  async deleteAssessment(assessmentId: string, user: any) {
    const current = await this.db.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      include: { teacherAssignment: { include: { section: { include: { academicYear: true } } } }, _count: { select: { attempts: true } } },
    });
    await this.assertAssignmentAccess(current.teacherAssignmentId, user);
    this.ensureYearOpen(current.teacherAssignment.section.academicYear.academicClosedAt);
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
    const assessment = await this.db.assessment.findUniqueOrThrow({ where: { id: assessmentId }, include: { teacherAssignment: { include: { section: { include: { academicYear: true } } } } } });
    if (user) await this.assertAssignmentAccess(assessment.teacherAssignmentId, user);
    this.ensureYearOpen(assessment.teacherAssignment.section.academicYear.academicClosedAt);
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
      if (!Number.isFinite(score) || score < 0 || score > Number(policy.maxScore)) throw new BadRequestException(`La calificación debe estar entre 0 y ${Number(policy.maxScore)}`);
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
      include: { teacherAssignment: { include: { section: { include: { academicYear: true } } } } },
    });
    await this.assertAssignmentAccess(assessment.teacherAssignmentId, user);
    this.ensureYearOpen(assessment.teacherAssignment.section.academicYear.academicClosedAt);
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
        if (!Number.isFinite(score) || score < 0 || score > Number(policy.maxScore)) throw new BadRequestException(`Todas las calificaciones deben estar entre 0 y ${Number(policy.maxScore)}`);
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

  private async closeOneStudentLapse(workspace: any, student: any) {
    const { assignment, policy, assessments, lapse } = workspace;
    if (assessments.length < policy.evaluationsMin || assessments.length > policy.evaluationsMax) throw new BadRequestException(`El lapso debe tener entre ${policy.evaluationsMin} y ${policy.evaluationsMax} evaluaciones`);
    let total = 0;
    let weight = 0;
    for (const assessment of assessments) {
      const first = assessment.attempts.find((x: any) => x.enrollmentId === student.id && x.form === AssessmentForm.PRIMERA);
      const second = assessment.attempts.find((x: any) => x.enrollmentId === student.id && x.form === AssessmentForm.SEGUNDA);
      const effective = this.effectiveAttemptScore(first, second);
      if (!effective.ready) throw new BadRequestException(`${student.student.firstName} ${student.student.lastName}: ${assessment.title} ${effective.reason}`);
      total += Number(effective.score) * Number(assessment.weight);
      weight += Number(assessment.weight);
    }
    if (weight <= 0) throw new BadRequestException('La ponderación total del lapso debe ser mayor que cero');
    const score = round2(total / weight);
    return this.db.lapseGrade.upsert({ where: { enrollmentId_teacherAssignmentId_lapseId: { enrollmentId: student.id, teacherAssignmentId: assignment.id, lapseId: lapse.id } }, update: { score, closedAt: new Date() }, create: { enrollmentId: student.id, teacherAssignmentId: assignment.id, lapseId: lapse.id, score, closedAt: new Date() } });
  }

  async closeAllLapse(assignmentId: string, lapseId: string, user: any) {
    const assignment = await this.assertAssignmentAccess(assignmentId, user);
    this.ensureYearOpen(assignment.section.academicYear.academicClosedAt);
    await this.assertAnnualNotFinalized(assignment);
    const workspace = await this.workspace(assignmentId, lapseId, user);
    const { policy, assessments, students } = workspace;
    if (assessments.length < policy.evaluationsMin || assessments.length > policy.evaluationsMax) throw new BadRequestException(`Debe crear entre ${policy.evaluationsMin} y ${policy.evaluationsMax} evaluaciones antes de cerrar el lapso`);
    let weightTotal = 0;
    for (const a of assessments) weightTotal += Number(a.weight);
    if (weightTotal <= 0) throw new BadRequestException('La ponderación total del lapso debe ser mayor que cero');
    const rows: { enrollmentId: string; score: number }[] = [];
    const errors: string[] = [];
    for (const student of students) {
      let total = 0;
      let weight = 0;
      for (const assessment of assessments) {
        const first = assessment.attempts.find((x: any) => x.enrollmentId === student.id && x.form === AssessmentForm.PRIMERA);
        const second = assessment.attempts.find((x: any) => x.enrollmentId === student.id && x.form === AssessmentForm.SEGUNDA);
        const effective = this.effectiveAttemptScore(first, second);
        if (!effective.ready) {
          errors.push(`${student.student.firstName} ${student.student.lastName}: ${assessment.title} (${effective.reason})`);
          break;
        }
        total += Number(effective.score) * Number(assessment.weight);
        weight += Number(assessment.weight);
      }
      if (!errors.some((x) => x.startsWith(`${student.student.firstName} ${student.student.lastName}:`))) rows.push({ enrollmentId: student.id, score: round2(total / weight) });
    }
    if (errors.length) throw new BadRequestException(`No se puede cerrar el lapso. ${errors.slice(0, 8).join(' · ')}${errors.length > 8 ? ` · y ${errors.length - 8} caso(s) más` : ''}`);
    const ops = rows.map((r) => this.db.lapseGrade.upsert({
      where: { enrollmentId_teacherAssignmentId_lapseId: { enrollmentId: r.enrollmentId, teacherAssignmentId: assignmentId, lapseId } },
      update: { score: r.score, closedAt: new Date() },
      create: { enrollmentId: r.enrollmentId, teacherAssignmentId: assignmentId, lapseId, score: r.score, closedAt: new Date() },
    }));
    if (ops.length) await this.db.$transaction(ops);
    return { ok: true, closed: rows.length, rows };
  }

  orientationLetter(score: number, policy: any) {
    return score >= Number(policy.orientationAmin) ? 'A' : score >= Number(policy.orientationBmin) ? 'B' : score >= Number(policy.orientationCmin) ? 'C' : 'D';
  }

  async finalizeAnnual(enrollmentId: string, studyPlanSubjectId: string, numericScore: number) {
    const e = await this.db.enrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: { curriculumSubjects: { where: { active: true } }, academicYear: true } });
    this.ensureYearOpen(e.academicYear.academicClosedAt);
    if (e.curriculumSubjects.length && !e.curriculumSubjects.some((x) => x.studyPlanSubjectId === studyPlanSubjectId)) throw new BadRequestException('No puede registrar definitiva de una materia que el estudiante no cursa en esta matrícula');
    const p = await this.db.gradingPolicy.findUniqueOrThrow({ where: { academicYearId: e.academicYearId } });
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > Number(p.maxScore)) throw new BadRequestException(`La definitiva debe estar entre 0 y ${Number(p.maxScore)}`);
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

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE)
  @Post('assignments/:assignmentId/lapses/:lapseId/assessments')
  createAssessment(@Param('assignmentId') a: string, @Param('lapseId') l: string, @CurrentUser() user: any, @Body() d: any) { return this.s.createAssessment(a, l, user, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE)
  @Patch('assessments/:assessmentId')
  updateAssessment(@Param('assessmentId') a: string, @CurrentUser() user: any, @Body() d: any) { return this.s.updateAssessment(a, user, d); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE)
  @Delete('assessments/:assessmentId')
  deleteAssessment(@Param('assessmentId') a: string, @CurrentUser() user: any) { return this.s.deleteAssessment(a, user); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE)
  @Post('assessments/:assessmentId/students/:enrollmentId/:form')
  attempt(@Param('assessmentId') a: string, @Param('enrollmentId') e: string, @Param('form') f: AssessmentForm, @Body() d: any, @CurrentUser() user: any) { return this.s.saveAttempt(a, e, f, d, user); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE)
  @Post('assessments/:assessmentId/bulk/:form')
  bulk(@Param('assessmentId') a: string, @Param('form') f: AssessmentForm, @CurrentUser() user: any, @Body('rows') rows: any[]) { return this.s.saveBulkAttempts(a, f, user, rows); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE)
  @Post('lapses/:lapseId/assignments/:assignmentId/students/:enrollmentId/close')
  close(@Param('enrollmentId') e: string, @Param('assignmentId') a: string, @Param('lapseId') l: string, @CurrentUser() user: any) { return this.s.closeLapse(e, a, l, user); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE)
  @Post('assignments/:assignmentId/lapses/:lapseId/close-all')
  closeAll(@Param('assignmentId') a: string, @Param('lapseId') l: string, @CurrentUser() user: any) { return this.s.closeAllLapse(a, l, user); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE, Role.SECRETARIA)
  @Get('assignments/:assignmentId/annual')
  annualWorkspace(@Param('assignmentId') a: string, @CurrentUser() user: any) { return this.s.annualWorkspace(a, user); }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.DOCENTE)
  @Post('assignments/:assignmentId/annual/confirm')
  annualConfirm(@Param('assignmentId') a: string, @CurrentUser() user: any, @Body('rows') rows: any[]) { return this.s.confirmAnnual(a, user, rows); }

  @Roles(Role.ADMIN, Role.DIRECTOR)
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
