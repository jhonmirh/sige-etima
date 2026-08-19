'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
  Unlock,
  UserRoundCog,
} from 'lucide-react';
import Shell from '@/components/Shell';
import { API, api, notify, token } from '@/lib/api';

type AttemptDraft = { attendance: 'PRESENTE' | 'INASISTENTE'; score: string; notes?: string };
type DraftMap = Record<string, Record<string, AttemptDraft>>;
type CalculationMode = 'PERCENTUAL' | 'ACUMULATIVA';

const TECHNIQUES = ['OBSERVACIÓN', 'INTERROGATORIO', 'ANÁLISIS DE PRODUCCIONES', 'EXPOSICIÓN', 'DEBATE', 'PROYECTO', 'DEMOSTRACIÓN', 'DESEMPEÑO', 'OTRA'];
const INSTRUMENTS = ['ESCALA DE ESTIMACIÓN', 'LISTA DE COTEJO', 'RÚBRICA', 'PRUEBA ESCRITA', 'PRUEBA ORAL', 'GUÍA DE OBSERVACIÓN', 'REGISTRO DESCRIPTIVO', 'CUESTIONARIO', 'PORTAFOLIO', 'OTRO'];

const gradeText = (value: any) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const rounded = Math.round(n * 100) / 100;
  const [integer, decimal] = String(rounded).split('.');
  return `${integer.padStart(2, '0')}${decimal ? `.${decimal}` : ''}`;
};
const scoreInputText = (value: any) => value === null || value === undefined || value === '' ? '' : gradeText(value);
const personName = (s: any) => [s?.firstName, s?.middleName, s?.lastName, s?.secondLastName].filter(Boolean).join(' ');
const isoLocal = (value?: string) => value ? String(value).slice(0, 16) : '';
const lapseStatusLabel = (status?: string) => status === 'OPEN' ? 'ACTIVO' : status === 'CLOSED' ? 'CERRADO' : 'INACTIVO';
const emptyAssessmentForm = (percentual = false) => ({ id: '', title: '', objective: '', technique: '', techniqueOther: '', instrument: '', instrumentOther: '', scheduledAt: '', weight: percentual ? '' : '1' });

function assessmentChoice(value: string | null | undefined, options: string[], otherLabel: string) {
  const normalized = String(value || '').toUpperCase();
  return options.includes(normalized) && normalized !== otherLabel ? { choice: normalized, other: '' } : { choice: normalized ? otherLabel : '', other: normalized };
}

function isAssessmentDateValid(value: string) {
  if (!value) return { ok: false, message: 'La fecha y hora de la evaluación son obligatorias.' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { ok: false, message: 'La fecha y hora de la evaluación no son válidas.' };
  const day = d.getDay();
  if (day === 0 || day === 6) return { ok: false, message: 'Las evaluaciones no pueden programarse sábado ni domingo.' };
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes < 7 * 60 || minutes > 18 * 60) return { ok: false, message: 'La evaluación debe programarse entre las 07:00 a. m. y las 06:00 p. m.' };
  return { ok: true, message: '' };
}

export default function GradesPage() {
  const [context, setContext] = useState<any>(null);
  const [yearId, setYearId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [lapseId, setLapseId] = useState('');
  const [workspace, setWorkspace] = useState<any>(null);
  const [annual, setAnnual] = useState<any>(null);
  const [firstDraft, setFirstDraft] = useState<DraftMap>({});
  const [secondDraft, setSecondDraft] = useState<DraftMap>({});
  const [annualDraft, setAnnualDraft] = useState<Record<string, string>>({});
  const [absenceDraft, setAbsenceDraft] = useState<Record<string, string>>({});
  const [absenceErrors, setAbsenceErrors] = useState<Record<string, string>>({});
  const [absenceSaveMsg, setAbsenceSaveMsg] = useState('');
  const [absenceSaveErr, setAbsenceSaveErr] = useState('');
  const [assessmentForm, setAssessmentForm] = useState(emptyAssessmentForm(false));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [closeErr, setCloseErr] = useState('');
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const [assessmentFeedback, setAssessmentFeedback] = useState<Record<string, string>>({});
  const [lapseDateDrafts, setLapseDateDrafts] = useState<Record<string, { startDate: string; endDate: string }>>({});
  const [loading, setLoading] = useState(false);

  const selectedYear = context?.years?.find((y: any) => y.id === yearId);
  const userRole = context?.userRole || '';
  const isAdmin = userRole === 'ADMIN';
  const isTeacher = userRole === 'DOCENTE';
  const canTranscribe = ['ADMIN', 'DOCENTE'].includes(userRole);
  const canPolicyConfigure = ['ADMIN', 'DIRECTOR'].includes(userRole);

  const filteredAssignments = useMemo(() => {
    const rows = context?.assignments || [];
    if (isTeacher) return rows;
    if (!teacherId) return [];
    return rows.filter((a: any) => a.staffId === teacherId || a.staff?.id === teacherId);
  }, [context, teacherId, isTeacher]);

  const selectedAssignment = context?.assignments?.find((a: any) => a.id === assignmentId);
  const selectedLapse = selectedYear?.lapses?.find((l: any) => l.id === lapseId);
  const lapseIsOpen = selectedLapse?.status === 'OPEN';
  const canGrade = canTranscribe && lapseIsOpen && !!assignmentId && !!lapseId;
  // El ADMIN puede corregir metadatos de una evaluación aunque el lapso esté inactivo,
  // siempre que el año académico no esté cerrado. El DOCENTE solo edita con lapso activo.
  const canEditAssessment = !!assignmentId && !!lapseId && !selectedYear?.academicClosedAt && (isAdmin || (isTeacher && lapseIsOpen));
  const editingAssessment = assessmentForm.id ? workspace?.assessments?.find((a: any) => a.id === assessmentForm.id) : null;
  const objectiveRepairMode = !!assessmentForm.id && (editingAssessment?.objective === null || editingAssessment?.objective === undefined);
  const canRepairPendingObjective = objectiveRepairMode && canEditAssessment;
  const objectiveTextLive = String(assessmentForm.objective || '').trim().replace(',', '.');
  const objectiveDuplicate = !!objectiveTextLive && !!workspace?.assessments?.some((a: any) =>
    a.id !== assessmentForm.id && a.objective !== null && a.objective !== undefined && Number(a.objective) === Number(objectiveTextLive)
  );

  async function loadContext(targetYear?: string, preferredTeacher?: string, preferredAssignment?: string) {
    try {
      setLoading(true);
      const q = targetYear ? `?academicYearId=${targetYear}` : '';
      const data = await api(`/grading/context${q}`);
      setContext(data);
      const selected = targetYear || data.selectedYearId || '';
      setYearId(selected);

      let nextTeacher = '';
      if (data.userRole === 'DOCENTE') nextTeacher = data.currentTeacherId || data.teachers?.[0]?.id || '';
      else if (preferredTeacher && data.teachers?.some((t: any) => t.id === preferredTeacher)) nextTeacher = preferredTeacher;
      else if (teacherId && data.teachers?.some((t: any) => t.id === teacherId)) nextTeacher = teacherId;
      else nextTeacher = data.teachers?.[0]?.id || '';
      setTeacherId(nextTeacher);

      const available = (data.assignments || []).filter((a: any) => data.userRole === 'DOCENTE' || a.staffId === nextTeacher || a.staff?.id === nextTeacher);
      const wantedAssignment = preferredAssignment || assignmentId;
      const nextAssignment = available.some((a: any) => a.id === wantedAssignment) ? wantedAssignment : (available[0]?.id || '');
      setAssignmentId(nextAssignment);
      if (nextAssignment !== assignmentId) {
        setWorkspace(null);
        setAnnual(null);
      }
      setErr('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkspace(targetAssignment = assignmentId, targetLapse = lapseId) {
    if (!targetAssignment || !targetLapse) { setWorkspace(null); return; }
    try {
      setLoading(true);
      const data = await api(`/grading/assignments/${targetAssignment}/lapses/${targetLapse}`);
      setWorkspace(data);
      const first: DraftMap = {};
      const second: DraftMap = {};
      for (const a of data.assessments || []) {
        first[a.id] = {};
        second[a.id] = {};
        for (const student of data.students || []) {
          const f = a.attempts?.find((x: any) => x.enrollmentId === student.id && x.form === 'PRIMERA');
          const s = a.attempts?.find((x: any) => x.enrollmentId === student.id && x.form === 'SEGUNDA');
          first[a.id][student.id] = { attendance: f?.attendance || 'PRESENTE', score: f?.score === null || f?.score === undefined ? '' : scoreInputText(f.score), notes: f?.notes || '' };
          second[a.id][student.id] = { attendance: s?.attendance || 'PRESENTE', score: s?.score === null || s?.score === undefined ? '' : scoreInputText(s.score), notes: s?.notes || '' };
        }
      }
      const absences: Record<string, string> = {};
      for (const student of data.students || []) {
        const grade = data.lapseGrades?.find((x: any) => x.enrollmentId === student.id);
        absences[student.id] = grade?.absences === null || grade?.absences === undefined ? '' : String(grade.absences);
      }
      setFirstDraft(first);
      setSecondDraft(second);
      setAbsenceDraft(absences);
      setAbsenceErrors({});
      setAbsenceSaveMsg('');
      setAbsenceSaveErr('');
      setCloseErr('');
      setErr('');
    } catch (e: any) {
      setErr(e.message);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnnual(targetAssignment = assignmentId) {
    if (!targetAssignment) return;
    try {
      setLoading(true);
      const data = await api(`/grading/assignments/${targetAssignment}/annual`);
      setAnnual(data);
      const d: Record<string, string> = {};
      for (const row of data.rows || []) {
        d[row.student.id] = row.annual?.numericScore !== null && row.annual?.numericScore !== undefined
          ? scoreInputText(row.annual.numericScore)
          : row.suggestedScore !== null ? scoreInputText(row.suggestedScore) : '';
      }
      setAnnualDraft(d);
      setErr('');
    } catch (e: any) {
      setErr(e.message);
      setAnnual(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadContext(); }, []);

  useEffect(() => {
    const next: Record<string, { startDate: string; endDate: string }> = {};
    for (const lapse of selectedYear?.lapses || []) {
      next[lapse.id] = {
        startDate: String(lapse.startDate || '').slice(0, 10),
        endDate: String(lapse.endDate || '').slice(0, 10),
      };
    }
    setLapseDateDrafts(next);
  }, [selectedYear]);

  useEffect(() => {
    const lapses = selectedYear?.lapses || [];
    if (!lapseId || !lapses.some((l: any) => l.id === lapseId)) {
      const active = lapses.find((l: any) => l.status === 'OPEN');
      setLapseId(active?.id || lapses[0]?.id || '');
    }
  }, [selectedYear, lapseId]);

  useEffect(() => {
    if (!context) return;
    if (!assignmentId || filteredAssignments.some((a: any) => a.id === assignmentId)) return;
    setAssignmentId(filteredAssignments[0]?.id || '');
    setWorkspace(null);
    setAnnual(null);
  }, [teacherId, context, filteredAssignments, assignmentId]);

  useEffect(() => { if (assignmentId && lapseId) loadWorkspace(); }, [assignmentId, lapseId]);

  const assessmentCountState = useMemo(() => {
    if (!workspace) return '';
    const count = workspace.assessments?.length || 0;
    const min = Number(workspace.policy?.evaluationsMin || 2);
    const max = Number(workspace.policy?.evaluationsMax || 5);
    return count < min ? `FALTAN ${min - count}` : count > max ? 'EXCEDE EL MÁXIMO' : 'RANGO VÁLIDO';
  }, [workspace]);

  function updateDraft(
    setter: Dispatch<SetStateAction<DraftMap>>,
    assessmentIdValue: string,
    enrollmentId: string,
    key: keyof AttemptDraft,
    value: string,
  ) {
    setter((prev: DraftMap) => ({
      ...prev,
      [assessmentIdValue]: {
        ...(prev[assessmentIdValue] || {}),
        [enrollmentId]: {
          ...(prev[assessmentIdValue]?.[enrollmentId] || { attendance: 'PRESENTE', score: '' }),
          [key]: value,
        } as AttemptDraft,
      },
    }));
  }

  function scoreErrorKey(form: 'PRIMERA' | 'SEGUNDA' | 'ANUAL', assessmentIdValue: string, enrollmentId: string) {
    return `${form}:${assessmentIdValue}:${enrollmentId}`;
  }

  function scoreValidationMessage(value: string) {
    if (!String(value || '').trim()) return '';
    const numeric = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(numeric)) return 'Ingrese una nota numérica entre 01 y 20.';
    if (numeric < 1) return 'La nota mínima permitida es 01.';
    if (numeric > 20) return 'La nota máxima permitida es 20.';
    return '';
  }

  function requiredScoreValidationMessage(value: string) {
    if (!String(value || '').trim()) return 'La nota es obligatoria cuando la asistencia es PRESENTE. Ingrese un valor entre 01 y 20.';
    return scoreValidationMessage(value);
  }

  function formFeedbackKey(form: 'PRIMERA' | 'SEGUNDA', assessmentIdValue: string) {
    return `${form}:${assessmentIdValue}`;
  }

  function scoreInputId(form: 'PRIMERA' | 'SEGUNDA', assessmentIdValue: string, enrollmentId: string) {
    return `score-${form.toLowerCase()}-${assessmentIdValue}-${enrollmentId}`;
  }

  function setFormFeedback(form: 'PRIMERA' | 'SEGUNDA', assessmentIdValue: string, message: string) {
    const key = formFeedbackKey(form, assessmentIdValue);
    setAssessmentFeedback((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }

  function focusInvalidScore(form: 'PRIMERA' | 'SEGUNDA', assessmentIdValue: string, enrollmentId: string) {
    setTimeout(() => {
      const el = document.getElementById(scoreInputId(form, assessmentIdValue, enrollmentId)) as HTMLInputElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      el.focus({ preventScroll: true });
      el.select();
    }, 30);
  }

  function setScoreError(key: string, message: string) {
    setScoreErrors((prev) => {
      if (!message && !prev[key]) return prev;
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }

  function changeDraftScore(
    setter: Dispatch<SetStateAction<DraftMap>>,
    form: 'PRIMERA' | 'SEGUNDA',
    assessmentIdValue: string,
    enrollmentId: string,
    value: string,
    studentLabel: string,
  ) {
    const clean = value.replace(',', '.');
    updateDraft(setter, assessmentIdValue, enrollmentId, 'score', clean);
    const message = scoreValidationMessage(clean);
    setScoreError(scoreErrorKey(form, assessmentIdValue, enrollmentId), message);
    if (message) setFormFeedback(form, assessmentIdValue, `${studentLabel}: ${message}`);
    else setFormFeedback(form, assessmentIdValue, '');
  }

  function normalizeDraftScore(setter: Dispatch<SetStateAction<DraftMap>>, form: 'PRIMERA' | 'SEGUNDA', assessmentIdValue: string, enrollmentId: string, value: string, studentLabel: string) {
    const message = requiredScoreValidationMessage(value);
    if (message) {
      setScoreError(scoreErrorKey(form, assessmentIdValue, enrollmentId), message);
      setFormFeedback(form, assessmentIdValue, `${studentLabel}: ${message}`);
      return;
    }
    const numeric = Number(String(value).replace(',', '.'));
    updateDraft(setter, assessmentIdValue, enrollmentId, 'score', scoreInputText(numeric));
    setScoreError(scoreErrorKey(form, assessmentIdValue, enrollmentId), '');
    setFormFeedback(form, assessmentIdValue, '');
  }

  async function setLapseActive(targetLapseId: string, active: boolean) {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const updated = await api(`/grading/lapses/${targetLapseId}/active`, { method: 'PATCH', body: JSON.stringify({ active }) });

      // Si el ADMIN activa un lapso desde las tarjetas de control, ese mismo lapso pasa a ser
      // inmediatamente el lapso de trabajo. Antes podía quedar seleccionado el lapso anterior
      // (ya inactivo), haciendo que "Agregar evaluación" siguiera bloqueado aunque otro lapso
      // apareciera como ACTIVO en pantalla.
      if (active) {
        setLapseId(targetLapseId);
        setAssessmentForm(emptyAssessmentForm(false));
        setAnnual(null);
      }

      await loadContext(yearId, teacherId, assignmentId);
      if (assignmentId && (active || targetLapseId === lapseId)) {
        await loadWorkspace(assignmentId, targetLapseId);
      }

      const number = updated?.number ? ` ${updated.number}` : '';
      setMsg(active
        ? `Lapso${number} activado y seleccionado para trabajar. Ya puede registrar evaluaciones.`
        : `Lapso${number} desactivado correctamente.`);
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  function updateLapseDateDraft(targetLapseId: string, key: 'startDate' | 'endDate', value: string) {
    setLapseDateDrafts((prev) => ({
      ...prev,
      [targetLapseId]: {
        startDate: prev[targetLapseId]?.startDate || '',
        endDate: prev[targetLapseId]?.endDate || '',
        [key]: value,
      },
    }));
  }

  async function saveLapseDates(targetLapseId: string) {
    if (!isAdmin || !yearId) return;
    const draft = lapseDateDrafts[targetLapseId];
    if (!draft?.startDate || !draft?.endDate) {
      setErr('Debe indicar las fechas Desde y Hasta del lapso.');
      return;
    }
    if (draft.startDate > draft.endDate) {
      setErr('La fecha Desde no puede ser posterior a la fecha Hasta.');
      return;
    }
    try {
      setLoading(true);
      const updated = await api(`/grading/lapses/${targetLapseId}/dates`, {
        method: 'PATCH',
        body: JSON.stringify({ startDate: draft.startDate, endDate: draft.endDate }),
        successMessage: false,
      });

      // Actualiza inmediatamente la fuente de verdad local con la respuesta persistida del API.
      // De esta forma la pantalla nunca conserva un borrador que parezca guardado si el backend
      // no lo almacenó y tampoco vuelve visualmente al calendario inicial al crear evaluaciones.
      setContext((prev: any) => prev ? ({
        ...prev,
        years: (prev.years || []).map((year: any) => year.id !== yearId ? year : ({
          ...year,
          lapses: (year.lapses || []).map((l: any) => l.id !== targetLapseId ? l : ({
            ...l,
            startDate: updated.startDate,
            endDate: updated.endDate,
          })),
        })),
      }) : prev);
      setLapseDateDrafts((prev) => ({
        ...prev,
        [targetLapseId]: {
          startDate: String(updated.startDate || draft.startDate).slice(0, 10),
          endDate: String(updated.endDate || draft.endDate).slice(0, 10),
        },
      }));

      await loadContext(yearId, teacherId, assignmentId);
      if (assignmentId && lapseId === targetLapseId) await loadWorkspace(assignmentId, targetLapseId);

      const outsideCount = Array.isArray(updated?.outOfRangeAssessments) ? updated.outOfRangeAssessments.length : 0;
      const message = outsideCount
        ? `Fechas del Lapso ${updated?.number || ''} guardadas. ${outsideCount} evaluación(es) existente(s) quedó(aron) fuera del nuevo período y debe(n) corregirse antes del cierre.`
        : `Fechas del Lapso ${updated?.number || ''} guardadas correctamente: ${draft.startDate} / ${draft.endDate}.`;
      setMsg(message);
      notify(message, outsideCount ? 'info' : 'success', outsideCount ? 4200 : 2200);
      setErr('');
    } catch (e: any) {
      // Si el API rechaza el cambio, restauramos en pantalla las fechas realmente persistidas.
      const persisted = selectedYear?.lapses?.find((l: any) => l.id === targetLapseId);
      if (persisted) {
        setLapseDateDrafts((prev) => ({
          ...prev,
          [targetLapseId]: {
            startDate: String(persisted.startDate || '').slice(0, 10),
            endDate: String(persisted.endDate || '').slice(0, 10),
          },
        }));
      }
      setErr(e.message);
      notify(`No se guardaron las fechas: ${e.message}`, 'error', 4800);
    } finally {
      setLoading(false);
    }
  }

  async function changeCalculationMode(mode: CalculationMode) {
    if (!assignmentId || !lapseId || !canGrade) return;
    try {
      setLoading(true);
      await api(`/grading/assignments/${assignmentId}/lapses/${lapseId}/calculation-mode`, {
        method: 'PATCH',
        body: JSON.stringify({ calculationMode: mode }),
      });
      await loadWorkspace();
      setAssessmentForm((prev) => ({ ...prev, weight: mode === 'PERCENTUAL' ? (prev.weight === '0' || prev.weight === '1' ? '' : prev.weight) : '1' }));
      setMsg(`Método de cálculo cambiado a ${mode === 'PERCENTUAL' ? 'PORCENTUAL' : 'ACUMULATIVO'}.`);
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function reassignTeacher(newStaffId: string) {
    if (!isAdmin || !assignmentId || !newStaffId || newStaffId === selectedAssignment?.staff?.id) return;
    if (!confirm('¿Cambiar el docente responsable de esta materia? Las evaluaciones y notas ya registradas permanecerán vinculadas a la misma asignación.')) return;
    try {
      setLoading(true);
      await api(`/grading/assignments/${assignmentId}/teacher`, { method: 'PATCH', body: JSON.stringify({ staffId: newStaffId }) });
      setTeacherId(newStaffId);
      await loadContext(yearId, newStaffId, assignmentId);
      await loadWorkspace(assignmentId, lapseId);
      setMsg('Docente responsable actualizado. El histórico de evaluaciones y notas se conservó.');
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function downloadRoster() {
    if (!assignmentId) return;
    try {
      setLoading(true);
      const accessToken = token();
      const response = await fetch(`${API}/reports/assignment/${assignmentId}.xlsx`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(data.message || 'No se pudo descargar la nómina');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nomina-${selectedAssignment?.section?.gradeLevel || ''}-${selectedAssignment?.section?.name || 'materia'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg('Nómina descargada correctamente.');
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function saveAssessment(e: FormEvent) {
    e.preventDefault();
    if (!assignmentId || !lapseId || !workspace) return;
    const currentEditing = assessmentForm.id ? (workspace.assessments || []).find((a: any) => a.id === assessmentForm.id) : null;
    const repairingPendingObjective = !!assessmentForm.id && (currentEditing?.objective === null || currentEditing?.objective === undefined);
    const editingExisting = !!assessmentForm.id;
    if (editingExisting ? !canEditAssessment : !canGrade) {
      setErr(editingExisting
        ? 'No tiene permiso para modificar esta evaluación. El ADMINISTRADOR puede corregirla mientras el año académico permanezca abierto; el DOCENTE necesita el lapso activo.'
        : 'El lapso está inactivo. El Administrador debe activarlo para crear evaluaciones.');
      return;
    }

    const objectiveText = String(assessmentForm.objective || '').trim().replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(objectiveText) || Number(objectiveText) <= 0) {
      setErr('El objetivo es obligatorio y debe ser numérico. Ejemplos: 1, 1.1, 2.3.');
      return;
    }
    const repeated = (workspace.assessments || []).some((a: any) => a.id !== assessmentForm.id && Number(a.objective) === Number(objectiveText));
    if (repeated) { setErr(`El objetivo ${objectiveText} ya fue utilizado en otra evaluación de esta materia.`); return; }

    // Las evaluaciones heredadas pueden tener fechas, técnicas o instrumentos que hoy ya no cumplen
    // las reglas nuevas. Al regularizar un OBJETIVO PENDIENTE se guarda exclusivamente ese dato;
    // no debemos bloquearlo por validaciones introducidas después de que la evaluación fue creada.
    if (repairingPendingObjective) {
      try {
        setLoading(true);
        await api(`/grading/assessments/${assessmentForm.id}/objective`, {
          method: 'PATCH',
          body: JSON.stringify({ objective: Number(objectiveText) }),
          successMessage: `Objetivo ${objectiveText} guardado correctamente.`,
        });
        setAssessmentForm(emptyAssessmentForm(workspace.calculationMode === 'PERCENTUAL'));
        await loadWorkspace();
        setMsg(`Objetivo ${objectiveText} guardado correctamente.`);
        setCloseErr('');
        setErr('');
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const technique = assessmentForm.technique === 'OTRA' ? assessmentForm.techniqueOther.trim().toUpperCase() : assessmentForm.technique;
    const instrument = assessmentForm.instrument === 'OTRO' ? assessmentForm.instrumentOther.trim().toUpperCase() : assessmentForm.instrument;
    if (!technique) { setErr('Seleccione una técnica. Si elige OTRA, debe describirla.'); return; }
    if (!instrument) { setErr('Seleccione un instrumento. Si elige OTRO, debe describirlo.'); return; }

    const originalScheduledAt = currentEditing?.scheduledAt ? isoLocal(currentEditing.scheduledAt) : '';
    const scheduledAtChanged = !assessmentForm.id || assessmentForm.scheduledAt !== originalScheduledAt;
    // Una evaluación heredada puede tener una fecha/hora que hoy ya no cumple las reglas.
    // Si el usuario NO cambia la fecha, permitimos corregir objetivo, contenido, técnica o instrumento
    // sin obligarlo a alterar el histórico. Si cambia la fecha, sí aplicamos todas las reglas vigentes.
    if (scheduledAtChanged) {
      const dateValidation = isAssessmentDateValid(assessmentForm.scheduledAt);
      if (!dateValidation.ok) { setErr(dateValidation.message); return; }
      const currentOrder = assessmentForm.id
        ? Number((workspace.assessments || []).find((a: any) => a.id === assessmentForm.id)?.orderNumber || 0)
        : (workspace.assessments?.length || 0) + 1;
      const previous = (workspace.assessments || []).filter((a: any) => Number(a.orderNumber) < currentOrder).sort((a: any,b: any)=>Number(b.orderNumber)-Number(a.orderNumber))[0];
      const next = (workspace.assessments || []).filter((a: any) => Number(a.orderNumber) > currentOrder).sort((a: any,b: any)=>Number(a.orderNumber)-Number(b.orderNumber))[0];
      if (previous?.scheduledAt && assessmentForm.scheduledAt <= isoLocal(previous.scheduledAt)) { setErr(`La evaluación ${currentOrder} debe tener una fecha y hora posterior a la evaluación ${previous.orderNumber}.`); return; }
      if (next?.scheduledAt && assessmentForm.scheduledAt >= isoLocal(next.scheduledAt)) { setErr(`La evaluación ${currentOrder} debe tener una fecha y hora anterior a la evaluación ${next.orderNumber}.`); return; }
    }

    try {
      setLoading(true);
      const body = {
        title: assessmentForm.title,
        objective: Number(objectiveText),
        technique,
        instrument,
        scheduledAt: assessmentForm.scheduledAt,
        weight: workspace.calculationMode === 'PERCENTUAL' ? Number(assessmentForm.weight) : 1,
      };
      if (assessmentForm.id) {
        await api(`/grading/assessments/${assessmentForm.id}`, { method: 'PATCH', body: JSON.stringify(body), successMessage: 'Evaluación actualizada correctamente.' });
      } else {
        await api(`/grading/assignments/${assignmentId}/lapses/${lapseId}/assessments`, { method: 'POST', body: JSON.stringify(body) });
      }
      const editing = !!assessmentForm.id;
      setAssessmentForm(emptyAssessmentForm(workspace.calculationMode === 'PERCENTUAL'));
      await loadWorkspace();
      setMsg(repairingPendingObjective ? `Objetivo ${objectiveText} agregado a la evaluación pendiente.` : editing ? 'Evaluación actualizada.' : 'Evaluación creada.');
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function deleteAssessment(id: string) {
    if (!canGrade) { setErr('El lapso está inactivo. El Administrador debe activarlo para modificar evaluaciones.'); return; }
    if (!confirm('¿Eliminar esta evaluación? Solo es posible si todavía no tiene notas cargadas.')) return;
    try {
      await api(`/grading/assessments/${id}`, { method: 'DELETE' });
      await loadWorkspace();
      setMsg('Evaluación eliminada.');
      setErr('');
    } catch (e: any) { setErr(e.message); }
  }

  async function saveForm(assessmentIdValue: string, form: 'PRIMERA' | 'SEGUNDA') {
    if (!canGrade) { setErr('El lapso está inactivo. El Administrador debe activarlo para cargar notas.'); return; }
    const source = form === 'PRIMERA' ? firstDraft : secondDraft;
    const eligibleStudents = (workspace?.students || []).filter((student: any) => {
      if (form === 'PRIMERA') return true;
      const a = workspace.assessments.find((x: any) => x.id === assessmentIdValue);
      const first = a?.attempts?.find((x: any) => x.enrollmentId === student.id && x.form === 'PRIMERA');
      return first && first.attendance !== 'INASISTENTE' && Number(first.score) < Number(workspace.policy.passingScore);
    });
    if (!eligibleStudents.length) {
      const message = 'No hay estudiantes habilitados para esta forma.';
      setFormFeedback(form, assessmentIdValue, message);
      return;
    }
    for (const student of eligibleStudents) {
      const draft = source[assessmentIdValue]?.[student.id] || { attendance: 'PRESENTE', score: '' };
      if (draft.attendance === 'PRESENTE') {
        const message = requiredScoreValidationMessage(String(draft.score));
        if (message) {
          setScoreError(scoreErrorKey(form, assessmentIdValue, student.id), message);
          setFormFeedback(form, assessmentIdValue, `${personName(student.student)}: ${message}`);
          focusInvalidScore(form, assessmentIdValue, student.id);
          return;
        }
      }
    }
    const rows = eligibleStudents.map((student: any) => ({ enrollmentId: student.id, ...(source[assessmentIdValue]?.[student.id] || { attendance: 'PRESENTE', score: '' }) }));
    try {
      setLoading(true);
      await api(`/grading/assessments/${assessmentIdValue}/bulk/${form}`, { method: 'POST', body: JSON.stringify({ rows }) });
      await loadWorkspace();
      setFormFeedback(form, assessmentIdValue, '');
      setMsg(`${form === 'PRIMERA' ? 'Primera' : 'Segunda'} forma guardada para ${rows.length} estudiante(s).`);
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  function absenceValidationMessage(value: string) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (!/^[1-9]\d*$/.test(text)) return 'Use solo números enteros positivos: 1, 2, 3...';
    return '';
  }

  function updateAbsence(enrollmentId: string, value: string) {
    // El campo acepta únicamente dígitos. Vacío significa que el estudiante no tuvo inasistencias.
    if (value && !/^\d+$/.test(value)) return;
    setAbsenceDraft((prev) => ({ ...prev, [enrollmentId]: value }));
    const message = absenceValidationMessage(value);
    setAbsenceErrors((prev) => {
      const next = { ...prev };
      if (message) next[enrollmentId] = message;
      else delete next[enrollmentId];
      return next;
    });
    setAbsenceSaveMsg('');
    setAbsenceSaveErr('');
    if (!message) setCloseErr('');
  }

  async function saveAbsences() {
    if (!workspace || !canGrade) {
      setAbsenceSaveMsg('');
      setAbsenceSaveErr('El lapso debe estar ACTIVO para guardar o modificar inasistencias.');
      return;
    }

    const invalidAbsence = (workspace.students || []).find((student: any) => absenceValidationMessage(absenceDraft[student.id] || ''));
    if (invalidAbsence) {
      const message = absenceValidationMessage(absenceDraft[invalidAbsence.id] || '');
      setAbsenceErrors((prev) => ({ ...prev, [invalidAbsence.id]: message }));
      setAbsenceSaveMsg('');
      setAbsenceSaveErr(`${personName(invalidAbsence.student)}: ${message}`);
      setTimeout(() => document.getElementById(`absences-${invalidAbsence.id}`)?.focus(), 30);
      return;
    }

    const rows = (workspace.students || []).map((student: any) => ({
      enrollmentId: student.id,
      absences: String(absenceDraft[student.id] || '').trim() || null,
    }));

    try {
      setLoading(true);
      setAbsenceSaveMsg('');
      setAbsenceSaveErr('');
      const result = await api(`/grading/assignments/${assignmentId}/lapses/${lapseId}/absences`, {
        method: 'POST',
        body: JSON.stringify({ rows }),
      });
      await loadWorkspace();
      const withAbsences = Number(result?.withAbsences || 0);
      const message = withAbsences > 0
        ? `Inasistencias del lapso guardadas correctamente. ${withAbsences} estudiante(s) con inasistencias registradas.`
        : 'Inasistencias del lapso guardadas correctamente. No se registraron inasistencias para esta materia.';
      setAbsenceSaveMsg(message);
      setMsg(message);
      setErr('');
      notify(message, 'success', 2600);
    } catch (e: any) {
      setAbsenceSaveMsg('');
      setAbsenceSaveErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function closeLapse() {
    if (!workspace || !canGrade) { setCloseErr('El lapso debe estar ACTIVO para calcular la definitiva.'); return; }
    const count = workspace.assessments?.length || 0;
    if (count < Number(workspace.policy.evaluationsMin) || count > Number(workspace.policy.evaluationsMax)) {
      setCloseErr(`Debe existir entre ${workspace.policy.evaluationsMin} y ${workspace.policy.evaluationsMax} evaluaciones antes del cierre.`);
      return;
    }
    const withoutObjective = (workspace.assessments || []).filter((a: any) => a.objective === null || a.objective === undefined);
    if (withoutObjective.length) {
      const labels = withoutObjective.map((a: any) => `Evaluación ${a.orderNumber}`).join(', ');
      setCloseErr(`${labels} ${withoutObjective.length === 1 ? 'no tiene' : 'no tienen'} objetivo numérico. Use el botón “Completar objetivo” de cada evaluación pendiente y luego vuelva a calcular la definitiva.`);
      return;
    }
    if (workspace.calculationMode === 'PERCENTUAL' && Math.abs(Number(workspace.percentageTotal) - 100) > 0.001) {
      setCloseErr(`No se puede calcular: la ponderación porcentual debe sumar exactamente 100%. Actualmente suma ${Number(workspace.percentageTotal).toFixed(2)}%.`);
      return;
    }
    const unsavedAbsence = (workspace.students || []).find((student: any) => {
      const saved = workspace.lapseGrades?.find((grade: any) => grade.enrollmentId === student.id)?.absences;
      const savedText = saved === null || saved === undefined ? '' : String(saved);
      return String(absenceDraft[student.id] || '').trim() !== savedText;
    });
    if (unsavedAbsence) {
      setCloseErr('Hay cambios de inasistencias sin guardar. Presione “Guardar inasistencias” antes de calcular la definitiva del lapso.');
      setTimeout(() => document.getElementById(`absences-${unsavedAbsence.id}`)?.focus(), 30);
      return;
    }
    const formula = workspace.calculationMode === 'PERCENTUAL'
      ? 'El sistema aplicará los porcentajes registrados, cuya suma debe ser 100%.'
      : 'El sistema sumará las evaluaciones, dividirá entre la cantidad registrada y redondeará el resultado final sin decimales.';
    if (!confirm(`¿Calcular la definitiva de este lapso para toda la nómina? ${formula}`)) return;
    try {
      setLoading(true);
      setCloseErr('');
      const r = await api(`/grading/assignments/${assignmentId}/lapses/${lapseId}/close-all`, { method: 'POST', body: JSON.stringify({}) });
      await loadWorkspace();
      setAbsenceSaveMsg('');
      setMsg(`Definitiva del lapso calculada para ${r.closed} estudiante(s).`);
      setErr('');
    } catch (e: any) {
      setCloseErr(e.message);
      setErr('');
    } finally { setLoading(false); }
  }

  async function confirmAnnual() {
    if (!annual || !canTranscribe) return;
    const ready = annual.rows.filter((r: any) => r.suggestedScore !== null);
    if (!ready.length) { setErr('No hay definitivas listas para confirmar.'); return; }
    if (ready.some((r: any) => { const n=Number(annualDraft[r.student.id]); return annualDraft[r.student.id] === '' || !Number.isFinite(n) || n < 1 || n > 20; })) {
      setErr('Revise las definitivas: todas deben estar entre 01 y 20.'); return;
    }
    const rows = ready.map((r: any) => ({ enrollmentId: r.student.id, numericScore: Number(annualDraft[r.student.id]) }));
    if (!confirm('¿Confirmar las definitivas anuales mostradas? Al completarse todas las materias del estudiante, el sistema calculará automáticamente su condición académica.')) return;
    try {
      setLoading(true);
      const result = await api(`/grading/assignments/${assignmentId}/annual/confirm`, { method: 'POST', body: JSON.stringify({ rows }) });
      await loadAnnual();
      setMsg(`Se guardaron ${result.saved} definitiva(s). ${result.academicConditionsFinalized ? `Se consolidó la condición académica de ${result.academicConditionsFinalized} estudiante(s).` : ''}`);
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function updatePolicy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api(`/grading/years/${yearId}/policy`, {
        method: 'PATCH',
        body: JSON.stringify({
          maxScore: Number(form.get('maxScore')),
          passingScore: Number(form.get('passingScore')),
          evaluationsMin: Number(form.get('evaluationsMin')),
          evaluationsMax: Number(form.get('evaluationsMax')),
        }),
      });
      await loadContext(yearId, teacherId, assignmentId);
      if (assignmentId && lapseId) await loadWorkspace();
      setMsg('Política de evaluación actualizada.');
      setErr('');
    } catch (e: any) { setErr(e.message); }
  }

  return <Shell title="Módulo de notas">
    <div className="page-heading">
      <div><div className="eyebrow">GESTIÓN DE EVALUACIÓN</div><h1>Notas, lapsos y definitivas</h1><p>Seleccione docente, materia y lapso; gestione las evaluaciones y calcule las definitivas con control de seguridad por lapso.</p></div>
      <button className="btn secondary" onClick={() => { loadContext(yearId, teacherId, assignmentId); if (assignmentId && lapseId) loadWorkspace(); }}><RefreshCw size={16}/> Actualizar</button>
    </div>

    {err && <div className="alert"><TriangleAlert size={17}/> {err}</div>}
    {msg && <div className="alert success"><CheckCircle2 size={17}/> {msg}</div>}

    <div className="card form-section notes-selector-card">
      <div className="section-head"><div><h3>Selección de trabajo</h3><p>Administrador selecciona cualquier docente con materias cargadas. Cada docente solo visualiza sus propias asignaciones.</p></div><BookOpenCheck/></div>
      <div className="form-grid cols-3">
        <div><label>Año escolar *</label><select className="input" value={yearId} onChange={e => { const value=e.target.value; setYearId(value); setTeacherId(''); setAssignmentId(''); setWorkspace(null); setAnnual(null); loadContext(value); }}><option value="">SELECCIONE</option>{context?.years?.map((y:any)=><option key={y.id} value={y.id}>{y.name}{y.active?' · ACTIVO':''}{y.academicClosedAt?' · FINALIZADO':''}</option>)}</select></div>
        <div><label>Docente *</label><select className="input" value={teacherId} onChange={e => { setTeacherId(e.target.value); setAssignmentId(''); setWorkspace(null); setAnnual(null); }} disabled={!yearId || isTeacher}><option value="">SELECCIONE</option>{context?.teachers?.map((t:any)=><option key={t.id} value={t.id}>{personName(t)}</option>)}</select></div>
        <div><label>Materia / sección *</label><select className="input" value={assignmentId} onChange={e => { setAssignmentId(e.target.value); setAnnual(null); }} disabled={!teacherId}><option value="">SELECCIONE</option>{filteredAssignments.map((a:any)=><option key={a.id} value={a.id}>{a.section.gradeLevel}° · {a.section.name} · {a.studyPlanSubject.subject.name}</option>)}</select></div>
        <div><label>Lapso *</label><select className="input" value={lapseId} onChange={e => setLapseId(e.target.value)} disabled={!yearId}><option value="">SELECCIONE</option>{selectedYear?.lapses?.map((l:any)=><option key={l.id} value={l.id}>LAPSO {l.number} · {lapseStatusLabel(l.status)} · {String(l.startDate).slice(0,10)} / {String(l.endDate).slice(0,10)}</option>)}</select></div>
      </div>
      {context?.userRole==='DOCENTE' && !context.teacherLinked && <div className="warning-banner"><TriangleAlert/> Su usuario DOCENTE todavía no está vinculado a una ficha de Personal. Administración debe asociarlo antes de cargar notas.</div>}
      {selectedAssignment && <div className="notes-assignment-summary"><strong>{selectedAssignment.studyPlanSubject.subject.name}</strong><span>{selectedAssignment.section.gradeLevel}° · {selectedAssignment.section.name}</span><span>PLAN {selectedAssignment.section.studyPlan.code}</span><span>{personName(selectedAssignment.staff)}</span><span className={`status ${lapseIsOpen?'ok':'warn'}`}>LAPSO {lapseStatusLabel(selectedLapse?.status)}</span></div>}
      {selectedAssignment && <div className="row-actions" style={{marginTop:14}}><button type="button" className="btn secondary" onClick={downloadRoster} disabled={loading}><Download size={16}/> Descargar nómina de esta materia</button></div>}
    </div>

    {isAdmin && selectedYear && <section className="card form-section">
      <div className="section-head"><div><h3>Control de seguridad de lapsos</h3><p>Solo ADMINISTRADOR puede activar o desactivar lapsos. Un lapso inactivo permite consulta, pero bloquea creación de evaluaciones, transcripción y cálculo de definitivas.</p></div><Lock/></div>
      <div className="lapse-control-grid">
        {selectedYear.lapses?.map((l:any)=><div className="lapse-control-item" key={l.id}>
          <span>Lapso {l.number}</span><strong>{String(l.startDate).slice(0,10)} / {String(l.endDate).slice(0,10)}</strong>
          <div className="row-actions" style={{marginTop:10}}><span className={`status ${l.status==='OPEN'?'ok':'warn'}`}>{lapseStatusLabel(l.status)}</span><button type="button" className={`btn ${l.status==='OPEN'?'secondary':''} mini-btn`} onClick={()=>setLapseActive(l.id,l.status!=='OPEN')} disabled={loading}>{l.status==='OPEN'?<><Lock size={14}/> Desactivar</>:<><Unlock size={14}/> Activar</>}</button></div>
          <div className="lapse-date-editor">
            <div><label>Desde</label><input className="input" type="date" value={lapseDateDrafts[l.id]?.startDate || ''} onChange={e=>updateLapseDateDraft(l.id,'startDate',e.target.value)} disabled={loading || !!selectedYear.academicClosedAt}/></div>
            <div><label>Hasta</label><input className="input" type="date" value={lapseDateDrafts[l.id]?.endDate || ''} onChange={e=>updateLapseDateDraft(l.id,'endDate',e.target.value)} disabled={loading || !!selectedYear.academicClosedAt}/></div>
          </div>
          <button type="button" className="btn secondary mini-btn lapse-date-save" onClick={()=>saveLapseDates(l.id)} disabled={loading || !!selectedYear.academicClosedAt}><Save size={14}/> Guardar fechas</button>
        </div>)}
      </div>
    </section>}

    {isAdmin && selectedAssignment && <section className="card form-section">
      <div className="section-head"><div><h3>Cambio de docente responsable</h3><p>Permite sustituir al docente de la materia sin perder evaluaciones, calificaciones ni definitivas ya registradas.</p></div><UserRoundCog/></div>
      <div className="form-grid cols-3"><div><label>Docente actual</label><input className="input" value={personName(selectedAssignment.staff)} readOnly/></div><div><label>Asignar a otro docente</label><select className="input" value={selectedAssignment.staff?.id || ''} onChange={e=>reassignTeacher(e.target.value)}><option value={selectedAssignment.staff?.id || ''}>{personName(selectedAssignment.staff)}</option>{context?.availableTeachers?.filter((t:any)=>t.id!==selectedAssignment.staff?.id).map((t:any)=><option key={t.id} value={t.id}>{personName(t)}</option>)}</select></div></div>
    </section>}

    {selectedYear?.gradingPolicy && <div className="section-title"><div><h2>Política de evaluación</h2><p className="muted">La escala y el número permitido de evaluaciones pertenecen al año escolar.</p></div></div>}
    {selectedYear?.gradingPolicy && <form className="card form-section" onSubmit={updatePolicy}>
      <div className="form-grid cols-3">
        <div><label>Nota máxima</label><input className="input" name="maxScore" type="number" step="0.01" defaultValue={Number(selectedYear.gradingPolicy.maxScore)} readOnly={!canPolicyConfigure}/></div>
        <div><label>Nota mínima aprobatoria</label><input className="input" name="passingScore" type="number" step="0.01" defaultValue={Number(selectedYear.gradingPolicy.passingScore)} readOnly={!canPolicyConfigure}/></div>
        <div><label>Evaluaciones por lapso</label><div className="inline-fields"><input className="input" name="evaluationsMin" type="number" min="2" max="5" defaultValue={selectedYear.gradingPolicy.evaluationsMin} readOnly={!canPolicyConfigure}/><input className="input" name="evaluationsMax" type="number" min="2" max="5" defaultValue={selectedYear.gradingPolicy.evaluationsMax} readOnly={!canPolicyConfigure}/></div></div>
      </div>{canPolicyConfigure && <button className="btn"><Save size={16}/> Guardar parámetros</button>}
    </form>}

    {workspace && <>
      {!lapseIsOpen && <div className="warning-banner"><Lock/> <div><strong>LAPSO INACTIVO</strong><span>No se pueden crear evaluaciones, guardar notas ni calcular definitivas hasta que ADMINISTRADOR active este lapso. El ADMINISTRADOR sí puede corregir los datos de evaluaciones ya existentes mientras el año académico permanezca abierto.</span></div></div>}

      <section className="card form-section">
        <div className="section-head"><div><h3>Método de cálculo de la definitiva del lapso</h3><p>Se configura por materia y por lapso. El docente responsable puede elegir el método mientras el lapso esté activo.</p></div><Calculator/></div>
        <div className="form-grid cols-3">
          <div><label>Método *</label><select className="input" value={workspace.calculationMode as CalculationMode} onChange={e=>changeCalculationMode(e.target.value as CalculationMode)} disabled={!canGrade}><option value="ACUMULATIVA">ACUMULATIVA · PROMEDIO SIMPLE</option><option value="PERCENTUAL">PORCENTUAL · SUMA 100%</option></select></div>
          {workspace.calculationMode==='PERCENTUAL'?<div><label>Ponderación registrada</label><div className={`input ${Math.abs(Number(workspace.percentageTotal)-100)<0.001?'':'warning-text'}`}>{Number(workspace.percentageTotal).toFixed(2)}% / 100%</div></div>:<div><label>Fórmula</label><div className="input">SUMA DE NOTAS ÷ N° DE EVALUACIONES · REDONDEO ENTERO</div></div>}
        </div>
        <div className="info-banner"><div><strong>{workspace.calculationMode==='PERCENTUAL'?'PORCENTUAL':'ACUMULATIVA'}</strong><span>{workspace.calculationMode==='PERCENTUAL'?'Cada evaluación lleva un porcentaje. Antes del cierre, la suma de todas las evaluaciones debe ser exactamente 100%.':'Todas las evaluaciones tienen el mismo peso. Ejemplo: 10 + 12 + 13 = 35; 35 ÷ 3 = 11,67; definitiva = 12.'}</span></div></div>
      </section>

      <div className="section-title"><div><h2>Evaluaciones del lapso {workspace.lapse.number}</h2><p className="muted">Debe existir entre {workspace.policy.evaluationsMin} y {workspace.policy.evaluationsMax} evaluaciones.</p></div><span className={`status ${(workspace.assessments.length>=workspace.policy.evaluationsMin&&workspace.assessments.length<=workspace.policy.evaluationsMax)?'ok':'warn'}`}>{workspace.assessments.length} EVALUACIÓN(ES) · {assessmentCountState}</span></div>

      {canTranscribe && <form id="assessment-editor" className="card form-section" onSubmit={saveAssessment}>
        <div className="section-head"><div><h3>{objectiveRepairMode?'Completar objetivo pendiente':assessmentForm.id?'Editar evaluación':'Nueva evaluación'}</h3><p>{objectiveRepairMode?'Esta evaluación fue creada antes de incorporar el campo Objetivo. Registre únicamente el objetivo faltante para habilitar el cálculo del lapso.':'Objetivo, contenido, técnica, instrumento y fecha/hora son obligatorios. Solo se permiten días hábiles entre 07:00 a. m. y 06:00 p. m., respetando el orden cronológico. '}{!objectiveRepairMode&&(workspace.calculationMode==='PERCENTUAL'?'Indique el porcentaje asignado.':'El sistema aplicará promedio simple acumulativo.')}</p></div>{assessmentForm.id?<Edit3/>:<Plus/>}</div>
        {objectiveRepairMode&&<div className="info-banner legacy-objective-banner"><div><strong>REGULARIZACIÓN DE EVALUACIÓN ANTERIOR</strong><span>Solo se guardará el objetivo. Los demás datos permanecen protegidos. Si el lapso está inactivo, el ADMINISTRADOR puede completar este dato sin reabrir la carga de notas.</span></div></div>}
        <div className="form-grid cols-3">
          <div><label>Objetivo *</label><input id="assessment-objective" className={`input ${objectiveDuplicate?'input-invalid':''}`} inputMode="decimal" placeholder="EJ.: 1.1" value={assessmentForm.objective} onChange={e=>setAssessmentForm({...assessmentForm,objective:e.target.value.replace(',', '.')})} required disabled={objectiveRepairMode?!canRepairPendingObjective:(assessmentForm.id?!canEditAssessment:!canGrade)}/>{objectiveDuplicate?<small className="field-error">Este objetivo ya está registrado en otra evaluación de esta materia. Debe utilizar un objetivo diferente.</small>:<small className="muted">Numérico o decimal. No puede repetirse en esta materia durante el año escolar.</small>}</div>
          <div><label>Contenido evaluado *</label><input className="input uppercase" value={assessmentForm.title} onChange={e=>setAssessmentForm({...assessmentForm,title:e.target.value.toUpperCase()})} required disabled={(assessmentForm.id?!canEditAssessment:!canGrade)||objectiveRepairMode}/></div>
          <div><label>Técnica *</label><select className="input" value={assessmentForm.technique} onChange={e=>setAssessmentForm({...assessmentForm,technique:e.target.value,techniqueOther:e.target.value==='OTRA'?assessmentForm.techniqueOther:''})} required disabled={(assessmentForm.id?!canEditAssessment:!canGrade)||objectiveRepairMode}><option value="">SELECCIONE</option>{TECHNIQUES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          {assessmentForm.technique==='OTRA'&&<div><label>Indique otra técnica *</label><input className="input uppercase" value={assessmentForm.techniqueOther} onChange={e=>setAssessmentForm({...assessmentForm,techniqueOther:e.target.value.toUpperCase()})} required disabled={(assessmentForm.id?!canEditAssessment:!canGrade)||objectiveRepairMode}/></div>}
          <div><label>Instrumento *</label><select className="input" value={assessmentForm.instrument} onChange={e=>setAssessmentForm({...assessmentForm,instrument:e.target.value,instrumentOther:e.target.value==='OTRO'?assessmentForm.instrumentOther:''})} required disabled={(assessmentForm.id?!canEditAssessment:!canGrade)||objectiveRepairMode}><option value="">SELECCIONE</option>{INSTRUMENTS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          {assessmentForm.instrument==='OTRO'&&<div><label>Indique otro instrumento *</label><input className="input uppercase" value={assessmentForm.instrumentOther} onChange={e=>setAssessmentForm({...assessmentForm,instrumentOther:e.target.value.toUpperCase()})} required disabled={(assessmentForm.id?!canEditAssessment:!canGrade)||objectiveRepairMode}/></div>}
          <div><label>Fecha y hora *</label><input className="input" type="datetime-local" min={workspace?.lapse?.startDate?`${String(workspace.lapse.startDate).slice(0,10)}T07:00`:undefined} max={workspace?.lapse?.endDate?`${String(workspace.lapse.endDate).slice(0,10)}T18:00`:undefined} value={assessmentForm.scheduledAt} onChange={e=>setAssessmentForm({...assessmentForm,scheduledAt:e.target.value})} required disabled={(assessmentForm.id?!canEditAssessment:!canGrade)||objectiveRepairMode}/><small className="muted">Período vigente: {String(workspace?.lapse?.startDate||'').slice(0,10)} al {String(workspace?.lapse?.endDate||'').slice(0,10)} · Lunes a viernes · 07:00 a. m. a 06:00 p. m.</small></div>
          {workspace.calculationMode==='PERCENTUAL'&&<div><label>Ponderación (%) *</label><input className="input" type="number" min="0.01" max="100" step="0.01" value={assessmentForm.weight} onChange={e=>setAssessmentForm({...assessmentForm,weight:e.target.value})} required disabled={(assessmentForm.id?!canEditAssessment:!canGrade)||objectiveRepairMode}/></div>}
        </div><div className="row-actions"><button className="btn" disabled={loading||objectiveDuplicate||(objectiveRepairMode?!canRepairPendingObjective:(assessmentForm.id?!canEditAssessment:!canGrade))}>{objectiveRepairMode?<><Save size={16}/> Guardar objetivo pendiente</>:assessmentForm.id?<><Save size={16}/> Guardar cambios</>:<><Plus size={16}/> Agregar evaluación</>}</button>{assessmentForm.id&&<button type="button" className="btn secondary" onClick={()=>setAssessmentForm(emptyAssessmentForm(workspace.calculationMode==='PERCENTUAL'))}>Cancelar edición</button>}</div>
      </form>}

      <div className="stack notes-assessment-stack">{workspace.assessments.length===0?<div className="card empty-state"><ClipboardCheck size={30}/><strong>No hay evaluaciones configuradas</strong><span>Cree entre {workspace.policy.evaluationsMin} y {workspace.policy.evaluationsMax} para comenzar la transcripción.</span></div>:workspace.assessments.map((assessment:any)=><div className="card assessment-card" key={assessment.id}>
        <div className="assessment-head"><div><div className="eyebrow">EVALUACIÓN {assessment.orderNumber} · OBJETIVO {assessment.objective??'PENDIENTE'}</div><h3>{assessment.title}</h3><p>{assessment.technique} · {assessment.instrument} · {String(assessment.scheduledAt).slice(0,16).replace('T',' ')}{workspace.calculationMode==='PERCENTUAL'?` · Ponderación ${Number(assessment.weight)}%`:' · ACUMULATIVA'}</p></div>{canTranscribe&&<div className="row-actions"><button className={`btn secondary mini-btn ${assessment.objective===null||assessment.objective===undefined?'repair-objective-btn':''}`} disabled={!canEditAssessment} title={!canEditAssessment&&!isAdmin?'El docente solo puede modificar evaluaciones cuando el lapso está activo.':!canEditAssessment&&isAdmin?'El año académico está cerrado y la evaluación está protegida.':''} onClick={()=>{const tc=assessmentChoice(assessment.technique,TECHNIQUES,'OTRA');const ic=assessmentChoice(assessment.instrument,INSTRUMENTS,'OTRO');setAssessmentForm({id:assessment.id,title:assessment.title,objective:assessment.objective===null||assessment.objective===undefined?'':String(assessment.objective),technique:tc.choice,techniqueOther:tc.other,instrument:ic.choice,instrumentOther:ic.other,scheduledAt:isoLocal(assessment.scheduledAt),weight:workspace.calculationMode==='PERCENTUAL'?String(assessment.weight):'1'});setTimeout(()=>document.getElementById('assessment-editor')?.scrollIntoView({behavior:'smooth',block:'start'}),40);}}><Edit3 size={14}/> {assessment.objective===null||assessment.objective===undefined?'Completar objetivo':'Editar'}</button><button className="btn secondary mini-btn" disabled={!canGrade} onClick={()=>deleteAssessment(assessment.id)}><Trash2 size={14}/> Eliminar</button></div>}</div>
        <div className="table-wrap grade-table-wrap"><table className="grade-table"><thead><tr><th>N°</th><th>Estudiante</th><th>1F asistencia</th><th>1F nota</th><th>Estado 1F</th><th>2F asistencia</th><th>2F nota</th><th>Estado 2F</th></tr></thead><tbody>{workspace.students.map((student:any)=>{
          const firstSaved=assessment.attempts?.find((x:any)=>x.enrollmentId===student.id&&x.form==='PRIMERA');
          const secondSaved=assessment.attempts?.find((x:any)=>x.enrollmentId===student.id&&x.form==='SEGUNDA');
          const secondEligible=!!firstSaved&&firstSaved.attendance!=='INASISTENTE'&&Number(firstSaved.score)<Number(workspace.policy.passingScore);
          const fd=firstDraft[assessment.id]?.[student.id]||{attendance:'PRESENTE',score:''};
          const sd=secondDraft[assessment.id]?.[student.id]||{attendance:'PRESENTE',score:''};
          return <tr key={student.id}><td>{student.listNumber??'PROV.'}</td><td><strong>{personName(student.student)}</strong><br/><small className="muted">{student.student.identityNumber?`${student.student.nationality==='VENEZOLANO'?'V':'E'}-${student.student.identityNumber}`:student.student.schoolIdentityNumber}</small></td>
            <td><select className="input compact-input" value={fd.attendance} disabled={!canGrade} onChange={e=>updateDraft(setFirstDraft,assessment.id,student.id,'attendance',e.target.value)}><option value="PRESENTE">PRESENTE</option><option value="INASISTENTE">INASISTENTE</option></select></td>
            <td><div className="grade-score-field"><input id={scoreInputId('PRIMERA',assessment.id,student.id)} className={`input score-input ${scoreErrors[scoreErrorKey('PRIMERA',assessment.id,student.id)]?'input-invalid':''}`} type="text" inputMode="decimal" placeholder="01-20" value={fd.score} disabled={!canGrade||fd.attendance==='INASISTENTE'} aria-invalid={!!scoreErrors[scoreErrorKey('PRIMERA',assessment.id,student.id)]} onChange={e=>changeDraftScore(setFirstDraft,'PRIMERA',assessment.id,student.id,e.target.value,personName(student.student))} onBlur={e=>normalizeDraftScore(setFirstDraft,'PRIMERA',assessment.id,student.id,e.target.value,personName(student.student))}/>{scoreErrors[scoreErrorKey('PRIMERA',assessment.id,student.id)]&&<small className="score-error"><TriangleAlert size={13}/>{scoreErrors[scoreErrorKey('PRIMERA',assessment.id,student.id)]}</small>}</div></td>
            <td>{firstSaved?<span className={`status ${firstSaved.attendance==='INASISTENTE'?'warn':Number(firstSaved.score)>=Number(workspace.policy.passingScore)?'ok':'neutral'}`}>{firstSaved.attendance==='INASISTENTE'?'INASISTENTE':Number(firstSaved.score)>=Number(workspace.policy.passingScore)?'APROBÓ':'NO APROBÓ'}</span>:<span className="muted">SIN GUARDAR</span>}</td>
            <td><select className="input compact-input" value={sd.attendance} disabled={!canGrade||!secondEligible} onChange={e=>updateDraft(setSecondDraft,assessment.id,student.id,'attendance',e.target.value)}><option value="PRESENTE">PRESENTE</option><option value="INASISTENTE">INASISTENTE</option></select></td>
            <td><div className="grade-score-field"><input id={scoreInputId('SEGUNDA',assessment.id,student.id)} className={`input score-input ${scoreErrors[scoreErrorKey('SEGUNDA',assessment.id,student.id)]?'input-invalid':''}`} type="text" inputMode="decimal" placeholder="01-20" value={sd.score} disabled={!canGrade||!secondEligible||sd.attendance==='INASISTENTE'} aria-invalid={!!scoreErrors[scoreErrorKey('SEGUNDA',assessment.id,student.id)]} onChange={e=>changeDraftScore(setSecondDraft,'SEGUNDA',assessment.id,student.id,e.target.value,personName(student.student))} onBlur={e=>normalizeDraftScore(setSecondDraft,'SEGUNDA',assessment.id,student.id,e.target.value,personName(student.student))}/>{scoreErrors[scoreErrorKey('SEGUNDA',assessment.id,student.id)]&&<small className="score-error"><TriangleAlert size={13}/>{scoreErrors[scoreErrorKey('SEGUNDA',assessment.id,student.id)]}</small>}</div></td>
            <td>{!firstSaved?<span className="muted">GUARDE 1F</span>:firstSaved.attendance==='INASISTENTE'?<span className="status warn">SIN DERECHO</span>:Number(firstSaved.score)>=Number(workspace.policy.passingScore)?<span className="status ok">NO REQUIERE</span>:secondSaved?<span className="status neutral">{secondSaved.attendance==='INASISTENTE'?'INASISTENTE':`2F ${gradeText(secondSaved.score)}`}</span>:<span className="status warn">HABILITADA</span>}</td>
          </tr>})}</tbody></table></div>
        {assessmentFeedback[formFeedbackKey('PRIMERA',assessment.id)]&&<div className="alert score-form-alert"><TriangleAlert size={17}/><div><strong>NO SE PUEDE GUARDAR LA PRIMERA FORMA</strong><span>{assessmentFeedback[formFeedbackKey('PRIMERA',assessment.id)]}</span></div></div>}
        {assessmentFeedback[formFeedbackKey('SEGUNDA',assessment.id)]&&<div className="alert score-form-alert"><TriangleAlert size={17}/><div><strong>NO SE PUEDE GUARDAR LA SEGUNDA FORMA</strong><span>{assessmentFeedback[formFeedbackKey('SEGUNDA',assessment.id)]}</span></div></div>}
        {canTranscribe&&<div className="row-actions assessment-actions"><button className="btn" disabled={!canGrade||loading} onClick={()=>saveForm(assessment.id,'PRIMERA')}><Save size={15}/> Guardar primera forma</button><button className="btn secondary" disabled={!canGrade||loading} onClick={()=>saveForm(assessment.id,'SEGUNDA')}><Save size={15}/> Guardar segunda forma habilitada</button></div>}
      </div>)}</div>

      <div className="section-title"><div><h2>Definitiva del lapso</h2><p className="muted">Se usa segunda forma cuando fue presentada; de lo contrario conserva primera forma. La inasistencia en primera forma computa 0.</p></div></div>
      <div className="card">
        <div className="info-banner"><div><strong>MÉTODO: {workspace.calculationMode==='PERCENTUAL'?'PORCENTUAL':'ACUMULATIVA'}</strong><span>{workspace.calculationMode==='PERCENTUAL'?`Ponderación actual: ${Number(workspace.percentageTotal).toFixed(2)}%. El cierre exige exactamente 100%.`:'Promedio simple de las evaluaciones y redondeo final sin decimales.'}</span></div></div>
        <div className="attendance-note"><strong>INASISTENCIAS DEL LAPSO</strong><span>Campo opcional por estudiante y materia. Déjelo vacío si no tuvo inasistencias. Solo admite números enteros positivos: 1, 2, 3...</span></div>
        <div className="table-wrap lapse-final-table"><table><thead><tr><th>N°</th><th>Estudiante</th><th>Definitiva lapso {workspace.lapse.number}</th><th>Inasistencias</th><th>Estado</th></tr></thead><tbody>{workspace.students.map((s:any)=>{const g=workspace.lapseGrades.find((x:any)=>x.enrollmentId===s.id);const calculated=g?.score!==null&&g?.score!==undefined;return <tr key={s.id}><td>{s.listNumber??'PROV.'}</td><td>{personName(s.student)}</td><td><strong>{gradeText(g?.score)}</strong></td><td>{canTranscribe?<div className="absence-field"><input id={`absences-${s.id}`} className={`input absence-input ${absenceErrors[s.id]?'input-invalid':''}`} type="text" inputMode="numeric" pattern="[1-9][0-9]*" placeholder="—" value={absenceDraft[s.id]||''} disabled={!canGrade} aria-invalid={!!absenceErrors[s.id]} onChange={e=>updateAbsence(s.id,e.target.value)}/>{absenceErrors[s.id]&&<small className="score-error"><TriangleAlert size={13}/>{absenceErrors[s.id]}</small>}</div>:<strong>{g?.absences??'—'}</strong>}</td><td>{calculated?<span className="status ok">CALCULADA</span>:<span className="status neutral">PENDIENTE</span>}</td></tr>})}</tbody></table></div>
        {absenceSaveErr&&<div className="alert" style={{marginTop:14}}><TriangleAlert size={17}/> {absenceSaveErr}</div>}
        {absenceSaveMsg&&<div className="alert success" style={{marginTop:14}}><CheckCircle2 size={17}/> {absenceSaveMsg}</div>}
        {closeErr&&<div className="alert" style={{marginTop:14}}><TriangleAlert size={17}/> {closeErr}</div>}
        {canTranscribe&&<div className="row-actions"><button className="btn secondary" disabled={!canGrade||loading} onClick={saveAbsences}><Save size={16}/> Guardar inasistencias</button><button className="btn" disabled={!canGrade||loading} onClick={closeLapse}><Calculator size={16}/> Calcular definitiva del lapso</button></div>}
      </div>

      <div className="section-title"><div><h2>Definitiva anual de la asignatura</h2><p className="muted">El promedio de los lapsos se presenta como sugerencia; no se guarda hasta que ADMINISTRADOR o DOCENTE responsable lo confirme.</p></div><button className="btn secondary" onClick={()=>loadAnnual()}><Calculator size={16}/> Cargar resumen anual</button></div>
      {annual&&<div className="card"><div className="info-banner">{annual.note}</div><div className="table-wrap annual-table"><table><thead><tr><th>N°</th><th>Estudiante</th>{annual.lapses.map((l:any)=><th key={l.id}>Lapso {l.number}</th>)}<th>Sugerida</th><th>Definitiva a confirmar</th><th>Resultado</th></tr></thead><tbody>{annual.rows.map((row:any)=><tr key={row.student.id}><td>{row.student.listNumber??'PROV.'}</td><td><strong>{personName(row.student.student)}</strong></td>{row.grades.map((g:any,i:number)=><td key={i}>{gradeText(g)}</td>)}<td><strong>{gradeText(row.suggestedScore)}</strong></td><td><div className="grade-score-field"><input className={`input score-input ${scoreErrors[scoreErrorKey('ANUAL','annual',row.student.id)]?'input-invalid':''}`} type="text" inputMode="decimal" placeholder="01-20" value={annualDraft[row.student.id]||''} disabled={!canTranscribe||row.suggestedScore===null} onChange={e=>{const value=e.target.value.replace(',', '.');setAnnualDraft({...annualDraft,[row.student.id]:value});setScoreError(scoreErrorKey('ANUAL','annual',row.student.id),scoreValidationMessage(value));}} onBlur={e=>{const message=scoreValidationMessage(e.target.value);if(!message&&e.target.value){const n=Number(e.target.value);setAnnualDraft({...annualDraft,[row.student.id]:scoreInputText(n)});setScoreError(scoreErrorKey('ANUAL','annual',row.student.id),'');setErr('');}else if(message){setScoreError(scoreErrorKey('ANUAL','annual',row.student.id),message);setErr(`${personName(row.student.student)}: ${message}`);}}}/>{scoreErrors[scoreErrorKey('ANUAL','annual',row.student.id)]&&<small className="score-error"><TriangleAlert size={13}/>{scoreErrors[scoreErrorKey('ANUAL','annual',row.student.id)]}</small>}</div></td><td>{row.annual?<><span className={`status ${row.annual.status==='APROBADO'?'ok':'warn'}`}>{row.annual.status}</span>{row.annual.letterScore&&<small className="muted"> · {row.annual.letterScore}</small>}</>:<span className="muted">SIN CONFIRMAR</span>}</td></tr>)}</tbody></table></div>{canTranscribe&&<div className="row-actions"><button className="btn" onClick={confirmAnnual}><CheckCircle2 size={16}/> Confirmar definitivas listas</button></div>}</div>}
    </>}

    {!workspace && assignmentId && lapseId && loading && <div className="card empty-state"><RefreshCw className="spin"/><strong>Cargando notas…</strong></div>}
    {!assignmentId && context && <div className="card empty-state"><BookOpenCheck size={30}/><strong>No hay una materia seleccionada</strong><span>{context.assignments?.length ? 'Seleccione un docente y luego una de sus materias asignadas.' : 'Todavía no existen asignaciones docentes activas para este año escolar.'}</span></div>}
  </Shell>;
}
