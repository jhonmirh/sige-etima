'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { BookOpenCheck, Calculator, CheckCircle2, ClipboardCheck, Edit3, Plus, RefreshCw, Save, Trash2, TriangleAlert } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';

type AttemptDraft = { attendance: 'PRESENTE' | 'INASISTENTE'; score: string; notes?: string };
type DraftMap = Record<string, Record<string, AttemptDraft>>;

const gradeText = (value: any) => value === null || value === undefined || value === '' ? '—' : Number(value).toFixed(2);
const personName = (s: any) => [s?.firstName, s?.middleName, s?.lastName, s?.secondLastName].filter(Boolean).join(' ');
const isoLocal = (value?: string) => value ? String(value).slice(0, 16) : '';

export default function GradesPage() {
  const [context, setContext] = useState<any>(null);
  const [yearId, setYearId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [lapseId, setLapseId] = useState('');
  const [workspace, setWorkspace] = useState<any>(null);
  const [annual, setAnnual] = useState<any>(null);
  const [firstDraft, setFirstDraft] = useState<DraftMap>({});
  const [secondDraft, setSecondDraft] = useState<DraftMap>({});
  const [annualDraft, setAnnualDraft] = useState<Record<string, string>>({});
  const [assessmentForm, setAssessmentForm] = useState({ id: '', title: '', technique: '', instrument: '', scheduledAt: '', weight: '1' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadContext(targetYear?: string) {
    try {
      setLoading(true);
      const q = targetYear ? `?academicYearId=${targetYear}` : '';
      const data = await api(`/grading/context${q}`);
      setContext(data);
      const selected = targetYear || data.selectedYearId || '';
      setYearId(selected);
      if (!assignmentId || !data.assignments.some((a: any) => a.id === assignmentId)) {
        setAssignmentId(data.assignments[0]?.id || '');
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
          first[a.id][student.id] = { attendance: f?.attendance || 'PRESENTE', score: f?.score === null || f?.score === undefined ? '' : String(f.score), notes: f?.notes || '' };
          second[a.id][student.id] = { attendance: s?.attendance || 'PRESENTE', score: s?.score === null || s?.score === undefined ? '' : String(s.score), notes: s?.notes || '' };
        }
      }
      setFirstDraft(first);
      setSecondDraft(second);
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
      for (const row of data.rows || []) d[row.student.id] = row.annual?.numericScore !== null && row.annual?.numericScore !== undefined ? String(row.annual.numericScore) : row.suggestedScore !== null ? String(row.suggestedScore) : '';
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
    const year = context?.years?.find((y: any) => y.id === yearId);
    const lapses = year?.lapses || [];
    if (!lapseId || !lapses.some((l: any) => l.id === lapseId)) setLapseId(lapses[0]?.id || '');
  }, [context, yearId]);
  useEffect(() => { if (assignmentId && lapseId) loadWorkspace(); }, [assignmentId, lapseId]);

  const selectedYear = context?.years?.find((y: any) => y.id === yearId);
  const selectedAssignment = context?.assignments?.find((a: any) => a.id === assignmentId);
  const readOnly = !!context?.readOnly;
  const canConfigure = ['ADMIN', 'DIRECTOR'].includes(context?.userRole);
  const canEdit = !readOnly && ['ADMIN', 'DIRECTOR', 'DOCENTE'].includes(context?.userRole);

  const assessmentCountState = useMemo(() => {
    if (!workspace) return '';
    const count = workspace.assessments?.length || 0;
    const min = Number(workspace.policy?.evaluationsMin || 2);
    const max = Number(workspace.policy?.evaluationsMax || 5);
    return count < min ? `FALTAN ${min - count}` : count > max ? 'EXCEDE EL MÁXIMO' : 'RANGO VÁLIDO';
  }, [workspace]);

  function updateDraft(
    setter: Dispatch<SetStateAction<DraftMap>>,
    assessmentId: string,
    enrollmentId: string,
    key: keyof AttemptDraft,
    value: string,
  ) {
    setter((prev: DraftMap) => ({
      ...prev,
      [assessmentId]: {
        ...(prev[assessmentId] || {}),
        [enrollmentId]: {
          ...(prev[assessmentId]?.[enrollmentId] || { attendance: 'PRESENTE', score: '' }),
          [key]: value,
        } as AttemptDraft,
      },
    }));
  }

  async function saveAssessment(e: FormEvent) {
    e.preventDefault();
    if (!assignmentId || !lapseId) return;
    try {
      setLoading(true);
      const body = { ...assessmentForm, weight: Number(assessmentForm.weight) };
      if (assessmentForm.id) await api(`/grading/assessments/${assessmentForm.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api(`/grading/assignments/${assignmentId}/lapses/${lapseId}/assessments`, { method: 'POST', body: JSON.stringify(body) });
      setAssessmentForm({ id: '', title: '', technique: '', instrument: '', scheduledAt: '', weight: '1' });
      await loadWorkspace();
      setMsg(assessmentForm.id ? 'Evaluación actualizada.' : 'Evaluación creada.');
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function deleteAssessment(id: string) {
    if (!confirm('¿Eliminar esta evaluación? Solo es posible si todavía no tiene notas cargadas.')) return;
    try {
      await api(`/grading/assessments/${id}`, { method: 'DELETE' });
      await loadWorkspace();
      setMsg('Evaluación eliminada.');
      setErr('');
    } catch (e: any) { setErr(e.message); }
  }

  async function saveForm(assessmentId: string, form: 'PRIMERA' | 'SEGUNDA') {
    const source = form === 'PRIMERA' ? firstDraft : secondDraft;
    const rows = (workspace?.students || []).filter((student: any) => {
      if (form === 'PRIMERA') return true;
      const a = workspace.assessments.find((x: any) => x.id === assessmentId);
      const first = a?.attempts?.find((x: any) => x.enrollmentId === student.id && x.form === 'PRIMERA');
      return first && first.attendance !== 'INASISTENTE' && Number(first.score) < Number(workspace.policy.passingScore);
    }).map((student: any) => ({ enrollmentId: student.id, ...(source[assessmentId]?.[student.id] || { attendance: 'PRESENTE', score: '' }) }));
    if (!rows.length) { setErr('No hay estudiantes habilitados para esta forma.'); return; }
    try {
      setLoading(true);
      await api(`/grading/assessments/${assessmentId}/bulk/${form}`, { method: 'POST', body: JSON.stringify({ rows }) });
      await loadWorkspace();
      setMsg(`${form === 'PRIMERA' ? 'Primera' : 'Segunda'} forma guardada para ${rows.length} estudiante(s).`);
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function closeLapse() {
    if (!confirm('¿Cerrar este lapso para toda la nómina de la asignación? El sistema calculará la definitiva del lapso con las ponderaciones registradas.')) return;
    try {
      setLoading(true);
      const r = await api(`/grading/assignments/${assignmentId}/lapses/${lapseId}/close-all`, { method: 'POST' });
      await loadWorkspace();
      setMsg(`Lapso calculado para ${r.closed} estudiante(s).`);
      setErr('');
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function confirmAnnual() {
    if (!annual) return;
    const ready = annual.rows.filter((r: any) => r.suggestedScore !== null);
    if (!ready.length) { setErr('No hay definitivas listas para confirmar.'); return; }
    if (ready.some((r: any) => annualDraft[r.student.id] === '' || !Number.isFinite(Number(annualDraft[r.student.id])))) { setErr('Revise las definitivas: todos los estudiantes listos deben tener una calificación válida.'); return; }
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
      await api(`/grading/years/${yearId}/policy`, { method: 'PATCH', body: JSON.stringify({ maxScore: Number(form.get('maxScore')), passingScore: Number(form.get('passingScore')), evaluationsMin: Number(form.get('evaluationsMin')), evaluationsMax: Number(form.get('evaluationsMax')) }) });
      await loadContext(yearId);
      if (assignmentId && lapseId) await loadWorkspace();
      setMsg('Política de evaluación actualizada.');
      setErr('');
    } catch (e: any) { setErr(e.message); }
  }

  return <Shell title="Módulo de notas">
    <div className="page-heading"><div><div className="eyebrow">GESTIÓN DE EVALUACIÓN</div><h1>Notas, lapsos y definitivas</h1><p>Configure evaluaciones, transcriba primera y segunda forma, cierre cada lapso y confirme la definitiva anual de la asignatura.</p></div><button className="btn secondary" onClick={() => { loadContext(yearId); if (assignmentId && lapseId) loadWorkspace(); }}><RefreshCw size={16}/> Actualizar</button></div>

    {err && <div className="alert"><TriangleAlert size={17}/> {err}</div>}
    {msg && <div className="alert success"><CheckCircle2 size={17}/> {msg}</div>}

    <div className="card form-section notes-selector-card">
      <div className="section-head"><div><h3>Selección de trabajo</h3><p>Los docentes solo visualizan sus propias asignaciones. Secretaría puede consultar, pero no modificar notas.</p></div><BookOpenCheck/></div>
      <div className="form-grid cols-3">
        <div><label>Año escolar *</label><select className="input" value={yearId} onChange={e => { const value=e.target.value; setYearId(value); setAssignmentId(''); setWorkspace(null); setAnnual(null); loadContext(value); }}><option value="">SELECCIONE</option>{context?.years?.map((y:any)=><option key={y.id} value={y.id}>{y.name}{y.active?' · ACTIVO':''}{y.academicClosedAt?' · FINALIZADO':''}</option>)}</select></div>
        <div><label>Asignación docente *</label><select className="input" value={assignmentId} onChange={e => { setAssignmentId(e.target.value); setAnnual(null); }} disabled={!yearId}><option value="">SELECCIONE</option>{context?.assignments?.map((a:any)=><option key={a.id} value={a.id}>{a.section.gradeLevel}° · {a.section.name} · {a.studyPlanSubject.subject.name}{context.userRole!=='DOCENTE'?` · ${a.staff.firstName} ${a.staff.lastName}`:''}</option>)}</select></div>
        <div><label>Lapso *</label><select className="input" value={lapseId} onChange={e => setLapseId(e.target.value)} disabled={!yearId}><option value="">SELECCIONE</option>{selectedYear?.lapses?.map((l:any)=><option key={l.id} value={l.id}>LAPSO {l.number} · {String(l.startDate).slice(0,10)} / {String(l.endDate).slice(0,10)}</option>)}</select></div>
      </div>
      {context?.userRole==='DOCENTE' && !context.teacherLinked && <div className="warning-banner"><TriangleAlert/> Su usuario DOCENTE todavía no está vinculado a una ficha de Personal. Dirección debe asociarlo antes de cargar notas.</div>}
      {selectedAssignment && <div className="notes-assignment-summary"><strong>{selectedAssignment.studyPlanSubject.subject.name}</strong><span>{selectedAssignment.section.gradeLevel}° · {selectedAssignment.section.name}</span><span>PLAN {selectedAssignment.section.studyPlan.code}</span><span>{personName(selectedAssignment.staff)}</span></div>}
    </div>

    {selectedYear?.gradingPolicy && <div className="section-title"><div><h2>Política de evaluación</h2><p className="muted">La escala y el número de evaluaciones pertenecen al año escolar.</p></div></div>}
    {selectedYear?.gradingPolicy && <form className="card form-section" onSubmit={updatePolicy}>
      <div className="form-grid cols-3">
        <div><label>Nota máxima</label><input className="input" name="maxScore" type="number" step="0.01" defaultValue={Number(selectedYear.gradingPolicy.maxScore)} readOnly={!canConfigure}/></div>
        <div><label>Nota mínima aprobatoria</label><input className="input" name="passingScore" type="number" step="0.01" defaultValue={Number(selectedYear.gradingPolicy.passingScore)} readOnly={!canConfigure}/></div>
        <div><label>Evaluaciones por lapso</label><div className="inline-fields"><input className="input" name="evaluationsMin" type="number" min="2" max="5" defaultValue={selectedYear.gradingPolicy.evaluationsMin} readOnly={!canConfigure}/><input className="input" name="evaluationsMax" type="number" min="2" max="5" defaultValue={selectedYear.gradingPolicy.evaluationsMax} readOnly={!canConfigure}/></div></div>
      </div>{canConfigure && <button className="btn"><Save size={16}/> Guardar parámetros</button>}
    </form>}

    {workspace && <>
      <div className="section-title"><div><h2>Evaluaciones del lapso {workspace.lapse.number}</h2><p className="muted">Debe existir entre {workspace.policy.evaluationsMin} y {workspace.policy.evaluationsMax} evaluaciones. La ponderación es relativa: puede usar, por ejemplo, 25 / 25 / 50.</p></div><span className={`status ${(workspace.assessments.length>=workspace.policy.evaluationsMin&&workspace.assessments.length<=workspace.policy.evaluationsMax)?'ok':'warn'}`}>{workspace.assessments.length} EVALUACIÓN(ES) · {assessmentCountState}</span></div>

      {canEdit && <form className="card form-section" onSubmit={saveAssessment}>
        <div className="section-head"><div><h3>{assessmentForm.id?'Editar evaluación':'Nueva evaluación'}</h3><p>Técnica, instrumento y fecha/hora son obligatorios.</p></div>{assessmentForm.id?<Edit3/>:<Plus/>}</div>
        <div className="form-grid cols-3">
          <div><label>Título *</label><input className="input uppercase" value={assessmentForm.title} onChange={e=>setAssessmentForm({...assessmentForm,title:e.target.value.toUpperCase()})} required/></div>
          <div><label>Técnica *</label><input className="input uppercase" value={assessmentForm.technique} onChange={e=>setAssessmentForm({...assessmentForm,technique:e.target.value.toUpperCase()})} required/></div>
          <div><label>Instrumento *</label><input className="input uppercase" value={assessmentForm.instrument} onChange={e=>setAssessmentForm({...assessmentForm,instrument:e.target.value.toUpperCase()})} required/></div>
          <div><label>Fecha y hora *</label><input className="input" type="datetime-local" value={assessmentForm.scheduledAt} onChange={e=>setAssessmentForm({...assessmentForm,scheduledAt:e.target.value})} required/></div>
          <div><label>Ponderación *</label><input className="input" type="number" min="0.01" step="0.01" value={assessmentForm.weight} onChange={e=>setAssessmentForm({...assessmentForm,weight:e.target.value})} required/></div>
        </div><div className="row-actions"><button className="btn" disabled={loading}>{assessmentForm.id?<><Save size={16}/> Guardar cambios</>:<><Plus size={16}/> Agregar evaluación</>}</button>{assessmentForm.id&&<button type="button" className="btn secondary" onClick={()=>setAssessmentForm({id:'',title:'',technique:'',instrument:'',scheduledAt:'',weight:'1'})}>Cancelar edición</button>}</div>
      </form>}

      <div className="stack notes-assessment-stack">{workspace.assessments.length===0?<div className="card empty-state"><ClipboardCheck size={30}/><strong>No hay evaluaciones configuradas</strong><span>Cree entre {workspace.policy.evaluationsMin} y {workspace.policy.evaluationsMax} para comenzar la transcripción.</span></div>:workspace.assessments.map((assessment:any)=><div className="card assessment-card" key={assessment.id}>
        <div className="assessment-head"><div><div className="eyebrow">EVALUACIÓN {assessment.orderNumber}</div><h3>{assessment.title}</h3><p>{assessment.technique} · {assessment.instrument} · {String(assessment.scheduledAt).slice(0,16).replace('T',' ')} · Ponderación {Number(assessment.weight)}</p></div>{canEdit&&<div className="row-actions"><button className="btn secondary mini-btn" onClick={()=>setAssessmentForm({id:assessment.id,title:assessment.title,technique:assessment.technique||'',instrument:assessment.instrument||'',scheduledAt:isoLocal(assessment.scheduledAt),weight:String(assessment.weight)})}><Edit3 size={14}/> Editar</button><button className="btn secondary mini-btn" onClick={()=>deleteAssessment(assessment.id)}><Trash2 size={14}/> Eliminar</button></div>}</div>
        <div className="table-wrap grade-table-wrap"><table className="grade-table"><thead><tr><th>N°</th><th>Estudiante</th><th>1F asistencia</th><th>1F nota</th><th>Estado 1F</th><th>2F asistencia</th><th>2F nota</th><th>Estado 2F</th></tr></thead><tbody>{workspace.students.map((student:any)=>{
          const firstSaved=assessment.attempts?.find((x:any)=>x.enrollmentId===student.id&&x.form==='PRIMERA');
          const secondSaved=assessment.attempts?.find((x:any)=>x.enrollmentId===student.id&&x.form==='SEGUNDA');
          const secondEligible=!!firstSaved&&firstSaved.attendance!=='INASISTENTE'&&Number(firstSaved.score)<Number(workspace.policy.passingScore);
          const fd=firstDraft[assessment.id]?.[student.id]||{attendance:'PRESENTE',score:''};
          const sd=secondDraft[assessment.id]?.[student.id]||{attendance:'PRESENTE',score:''};
          return <tr key={student.id}><td>{student.listNumber??'PROV.'}</td><td><strong>{personName(student.student)}</strong><br/><small className="muted">{student.student.identityNumber?`${student.student.nationality==='VENEZOLANO'?'V':'E'}-${student.student.identityNumber}`:student.student.schoolIdentityNumber}</small></td>
            <td><select className="input compact-input" value={fd.attendance} disabled={!canEdit} onChange={e=>updateDraft(setFirstDraft,assessment.id,student.id,'attendance',e.target.value)}><option value="PRESENTE">PRESENTE</option><option value="INASISTENTE">INASISTENTE</option></select></td>
            <td><input className="input score-input" type="number" min="0" max={Number(workspace.policy.maxScore)} step="0.01" value={fd.score} disabled={!canEdit||fd.attendance==='INASISTENTE'} onChange={e=>updateDraft(setFirstDraft,assessment.id,student.id,'score',e.target.value)}/></td>
            <td>{firstSaved?<span className={`status ${firstSaved.attendance==='INASISTENTE'?'warn':Number(firstSaved.score)>=Number(workspace.policy.passingScore)?'ok':'neutral'}`}>{firstSaved.attendance==='INASISTENTE'?'INASISTENTE':Number(firstSaved.score)>=Number(workspace.policy.passingScore)?'APROBÓ':'NO APROBÓ'}</span>:<span className="muted">SIN GUARDAR</span>}</td>
            <td><select className="input compact-input" value={sd.attendance} disabled={!canEdit||!secondEligible} onChange={e=>updateDraft(setSecondDraft,assessment.id,student.id,'attendance',e.target.value)}><option value="PRESENTE">PRESENTE</option><option value="INASISTENTE">INASISTENTE</option></select></td>
            <td><input className="input score-input" type="number" min="0" max={Number(workspace.policy.maxScore)} step="0.01" value={sd.score} disabled={!canEdit||!secondEligible||sd.attendance==='INASISTENTE'} onChange={e=>updateDraft(setSecondDraft,assessment.id,student.id,'score',e.target.value)}/></td>
            <td>{!firstSaved?<span className="muted">GUARDE 1F</span>:firstSaved.attendance==='INASISTENTE'?<span className="status warn">SIN DERECHO</span>:Number(firstSaved.score)>=Number(workspace.policy.passingScore)?<span className="status ok">NO REQUIERE</span>:secondSaved?<span className="status neutral">{secondSaved.attendance==='INASISTENTE'?'INASISTENTE':`2F ${gradeText(secondSaved.score)}`}</span>:<span className="status warn">HABILITADA</span>}</td>
          </tr>})}</tbody></table></div>
        {canEdit&&<div className="row-actions assessment-actions"><button className="btn" onClick={()=>saveForm(assessment.id,'PRIMERA')}><Save size={15}/> Guardar primera forma</button><button className="btn secondary" onClick={()=>saveForm(assessment.id,'SEGUNDA')}><Save size={15}/> Guardar segunda forma habilitada</button></div>}
      </div>)}</div>

      <div className="section-title"><div><h2>Definitiva del lapso</h2><p className="muted">Al cerrar, el sistema usa la segunda forma cuando fue presentada; si no, conserva la primera. La inasistencia en primera forma computa 0 y no habilita segunda forma.</p></div></div>
      <div className="card"><div className="table-wrap"><table><thead><tr><th>N°</th><th>Estudiante</th><th>Definitiva lapso {workspace.lapse.number}</th><th>Estado</th></tr></thead><tbody>{workspace.students.map((s:any)=>{const g=workspace.lapseGrades.find((x:any)=>x.enrollmentId===s.id);return <tr key={s.id}><td>{s.listNumber??'PROV.'}</td><td>{personName(s.student)}</td><td><strong>{gradeText(g?.score)}</strong></td><td>{g?<span className="status ok">CALCULADA</span>:<span className="status neutral">PENDIENTE</span>}</td></tr>})}</tbody></table></div>{canEdit&&<div className="row-actions"><button className="btn" onClick={closeLapse}><Calculator size={16}/> Calcular / cerrar lapso para la nómina</button></div>}</div>

      <div className="section-title"><div><h2>Definitiva anual de la asignatura</h2><p className="muted">El sistema muestra el promedio aritmético de los lapsos como sugerencia; no se guarda hasta que el docente lo confirme.</p></div><button className="btn secondary" onClick={()=>loadAnnual()}><Calculator size={16}/> Cargar resumen anual</button></div>
      {annual&&<div className="card"><div className="info-banner">{annual.note}</div><div className="table-wrap annual-table"><table><thead><tr><th>N°</th><th>Estudiante</th>{annual.lapses.map((l:any)=><th key={l.id}>Lapso {l.number}</th>)}<th>Sugerida</th><th>Definitiva a confirmar</th><th>Resultado</th></tr></thead><tbody>{annual.rows.map((row:any)=><tr key={row.student.id}><td>{row.student.listNumber??'PROV.'}</td><td><strong>{personName(row.student.student)}</strong></td>{row.grades.map((g:any,i:number)=><td key={i}>{gradeText(g)}</td>)}<td><strong>{gradeText(row.suggestedScore)}</strong></td><td><input className="input score-input" type="number" min="0" max={Number(annual.policy.maxScore)} step="0.01" value={annualDraft[row.student.id]||''} disabled={!canEdit||row.suggestedScore===null} onChange={e=>setAnnualDraft({...annualDraft,[row.student.id]:e.target.value})}/></td><td>{row.annual?<><span className={`status ${row.annual.status==='APROBADO'?'ok':'warn'}`}>{row.annual.status}</span>{row.annual.letterScore&&<small className="muted"> · {row.annual.letterScore}</small>}</>:<span className="muted">SIN CONFIRMAR</span>}</td></tr>)}</tbody></table></div>{canEdit&&<div className="row-actions"><button className="btn" onClick={confirmAnnual}><CheckCircle2 size={16}/> Confirmar definitivas listas</button></div>}</div>}
    </>}

    {!workspace && assignmentId && lapseId && loading && <div className="card empty-state"><RefreshCw className="spin"/><strong>Cargando notas…</strong></div>}
    {!assignmentId && context && <div className="card empty-state"><BookOpenCheck size={30}/><strong>No hay una asignación seleccionada</strong><span>{context.assignments?.length ? 'Seleccione una asignación para comenzar.' : 'Todavía no existen asignaciones docentes activas para este año escolar.'}</span></div>}
  </Shell>;
}
