'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, CheckCircle2, ChevronRight, CirclePlus, Pencil, Power, School, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { toUpperInput } from '@/lib/formRules';

function modalityLabel(value?: string) {
  return value === 'MEDIA_TECNICA' ? 'MEDIA TÉCNICA' : 'MEDIA GENERAL';
}

function gradeLabel(grade: number) {
  return `${grade}° AÑO`;
}

export default function Plans() {
  const [me, setMe] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [activeRows, setActiveRows] = useState<any[]>([]);
  const [modality, setModality] = useState('MEDIA_GENERAL');
  const [selectedId, setSelectedId] = useState('');
  const [curriculum, setCurriculum] = useState<any>(null);
  const [grade, setGrade] = useState(1);
  const [manualModality, setManualModality] = useState('MEDIA_GENERAL');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const curriculumRef = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => rows.filter((p: any) => p.modality === modality), [rows, modality]);
  const manualPlans = useMemo(() => rows.filter((p: any) => !p.officialCatalog), [rows]);
  const selected = useMemo(() => rows.find((p: any) => p.id === selectedId), [rows, selectedId]);
  const gradeSubjects = useMemo(
    () => (curriculum?.subjects || []).filter((r: any) => Number(r.gradeLevel) === grade),
    [curriculum, grade],
  );
  const countsByGrade = useMemo(() => {
    if (!curriculum) return [] as { grade: number; count: number }[];
    return Array.from({ length: curriculum.maxGrade || 1 }, (_, i) => {
      const g = i + 1;
      return { grade: g, count: (curriculum.subjects || []).filter((r: any) => r.active !== false && Number(r.gradeLevel) === g).length };
    });
  }, [curriculum]);

  async function load(preferredId?: string) {
    try {
      const [user, all, active] = await Promise.all([
        api('/auth/me'),
        api('/academic/plans?all=true'),
        api('/academic/plans'),
      ]);
      setMe(user);
      setRows(all);
      setActiveRows(active);
      const preferred = preferredId || selectedId;
      const candidate = all.find((p: any) => p.id === preferred)
        || all.find((p: any) => p.modality === modality)
        || all[0];
      if (candidate) setSelectedId(candidate.id);
      setErr('');
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const available = rows.filter((p: any) => p.modality === modality);
    if (!available.some((p: any) => p.id === selectedId)) {
      setSelectedId(available[0]?.id || '');
      setCurriculum(null);
      setGrade(1);
    }
  }, [modality, rows, selectedId]);

  async function openCurriculum(planId: string, scroll = true) {
    try {
      const data = await api(`/academic/plans/${planId}/curriculum`);
      setSelectedId(planId);
      setCurriculum(data);
      setGrade(1);
      setErr('');
      if (scroll) setTimeout(() => curriculumRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  async function assign(plan: any) {
    try {
      const updated = await api(`/academic/plans/${plan.id}/assign`, { method: 'POST' });
      setMsg(`Plan ${updated.code} asignado y activado para la institución. Ya puede utilizarse para crear secciones y matricular estudiantes.`);
      setErr('');
      await load(updated.id);
      await openCurriculum(updated.id, false);
    } catch (e: any) {
      setErr(String(e?.message || e));
      try { await openCurriculum(plan.id); } catch {}
    }
  }

  async function setActive(plan: any, active: boolean) {
    if (!active && !confirm(`¿Inactivar el plan ${plan.code} para nuevas secciones y matrículas? El histórico no será eliminado.`)) return;
    try {
      await api(`/academic/plans/${plan.id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) });
      setMsg(active ? `Plan ${plan.code} activado.` : `Plan ${plan.code} inactivado para nuevas operaciones. El histórico permanece intacto.`);
      setErr('');
      await load(plan.id);
      if (curriculum?.id === plan.id) await openCurriculum(plan.id, false);
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  async function deletePlan(plan: any) {
    if (plan?.officialCatalog) {
      setErr('Los planes del catálogo nacional no pueden eliminarse; solo pueden inactivarse.');
      return;
    }
    const enrollments = Number(plan?._count?.enrollments || 0);
    const sections = Number(plan?._count?.sections || 0);
    if (enrollments > 0 || sections > 0) {
      setErr(`El plan ${plan.code} ya tiene uso académico y no puede borrarse. Debe conservarse para el histórico e inactivarse.`);
      return;
    }
    const ok = confirm(
      `¿ELIMINAR DEFINITIVAMENTE el plan manual ${plan.code} · ${plan.optionName || plan.name}?\n\n` +
      'Se borrarán también su malla y sus menciones no utilizadas. Esta acción no se puede deshacer.\n\n' +
      'Los planes oficiales del catálogo nacional nunca se eliminan.'
    );
    if (!ok) return;
    try {
      await api(`/academic/plans/${plan.id}`, { method: 'DELETE' });
      setMsg(`Plan manual ${plan.code} eliminado correctamente.`);
      setErr('');
      if (curriculum?.id === plan.id) {
        setCurriculum(null);
        setGrade(1);
      }
      setSelectedId('');
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function createPlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const created = await api('/academic/plans', {
        method: 'POST',
        body: JSON.stringify({
          modality: String(f.get('modality') || ''),
          code: String(f.get('code') || ''),
          specialtyName: manualModality === 'MEDIA_TECNICA' ? String(f.get('specialtyName') || '').toLocaleUpperCase('es-VE') : undefined,
          optionName: String(f.get('optionName') || '').toLocaleUpperCase('es-VE'),
          hasMention: false,
        }),
      });
      setMsg(`Plan ${created.code} incorporado como INACTIVO. Ahora cargue las materias de sus ${created.maxGrade} años y luego asígnelo a la institución.`);
      setErr('');
      form.reset();
      setManualModality('MEDIA_GENERAL');
      setModality(created.modality);
      await load(created.id);
      await openCurriculum(created.id);
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  async function addSubject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!curriculum?.id) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api(`/academic/plans/${curriculum.id}/subjects`, {
        method: 'POST',
        body: JSON.stringify({
          gradeLevel: grade,
          name: String(f.get('name') || '').toLocaleUpperCase('es-VE'),
          component: String(f.get('component') || '').toLocaleUpperCase('es-VE') || undefined,
          weeklyHours: f.get('weeklyHours') ? Number(f.get('weeklyHours')) : undefined,
          annualHours: f.get('annualHours') ? Number(f.get('annualHours')) : undefined,
          gradingType: String(f.get('gradingType') || 'NUMERIC'),
        }),
      });
      setMsg(`Materia agregada a ${gradeLabel(grade)}.`);
      setErr('');
      form.reset();
      await load(curriculum.id);
      await openCurriculum(curriculum.id, false);
      setGrade(grade);
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  async function toggleSubject(row: any) {
    try {
      await api(`/academic/plan-subjects/${row.id}`, { method: 'PATCH', body: JSON.stringify({ active: row.active === false }) });
      setMsg(row.active === false ? 'Materia activada.' : 'Materia inactivada.');
      setErr('');
      await openCurriculum(curriculum.id, false);
      setGrade(grade);
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  async function editSubject(row: any) {
    const name = prompt('Nombre de la materia', row.subject?.name || '');
    if (name === null) return;
    const component = prompt('Componente / área', row.component || '') ?? row.component ?? '';
    const weekly = prompt('Horas semanales (deje vacío si no aplica)', row.weeklyHours == null ? '' : String(row.weeklyHours));
    if (weekly === null) return;
    const annual = prompt('Horas anuales (deje vacío si no aplica)', row.annualHours == null ? '' : String(row.annualHours));
    if (annual === null) return;
    try {
      await api(`/academic/plan-subjects/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.toLocaleUpperCase('es-VE'),
          component: component.toLocaleUpperCase('es-VE') || undefined,
          weeklyHours: weekly.trim() ? Number(weekly) : undefined,
          annualHours: annual.trim() ? Number(annual) : undefined,
        }),
      });
      setMsg('Materia actualizada.');
      setErr('');
      await openCurriculum(curriculum.id, false);
      setGrade(grade);
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  const canAdmin = me?.role === 'ADMIN';

  return <Shell title="Planes de estudio">
    <div className="page-heading">
      <div>
        <span className="eyebrow">Oferta académica institucional</span>
        <h1>Planes de estudio y mallas curriculares</h1>
        <p>Seleccione los planes oficiales que utilizará la institución, incorpore un código nuevo cuando sea autorizado y gestione las materias que alimentan Matrícula y Notas.</p>
      </div>
      <Link className="btn secondary" href="/enrollments/configuration">Configuración de matrícula</Link>
    </div>

    {msg && <div className="success-banner"><div><strong>OPERACIÓN COMPLETADA</strong><span>{msg}</span></div></div>}
    {err && <div className="alert">{err}</div>}

    <div className="info-banner" style={{ marginBottom: 16 }}><div>
      <strong>REGLA DE CONTINUIDAD ACADÉMICA</strong>
      <span>Un estudiante interno conserva su modalidad y su plan de estudio durante la reinscripción. Los planes activados aquí amplían la oferta para nuevos ingresos y nuevas secciones, pero no permiten cambiar arbitrariamente el plan de un estudiante ya incorporado.</span>
    </div></div>

    {canAdmin ? <>
      <section className="card form-section" style={{ border: '2px solid #174a8b', marginBottom: 16 }}>
        <div className="section-head"><div>
          <span className="eyebrow">Paso 1 · Catálogo nacional</span>
          <h2>Asignar un nuevo plan a la institución</h2>
          <p>El catálogo ya contiene los códigos precargados. Seleccione modalidad y código; el sistema mostrará automáticamente la opción, especialidad, duración y mención. Al asignarlo quedará disponible para crear secciones, matrícula y soporte de Notas.</p>
        </div><BookOpenCheck size={25}/></div>

        <div className="decision-grid" style={{ marginBottom: 16 }}>
          <div><span>Catálogo disponible</span><strong>{rows.length}</strong></div>
          <div><span>Asignados / activos</span><strong>{activeRows.length}</strong></div>
          <div><span>Media General activos</span><strong>{activeRows.filter((p:any)=>p.modality==='MEDIA_GENERAL').length}</strong></div>
          <div><span>Media Técnica activos</span><strong>{activeRows.filter((p:any)=>p.modality==='MEDIA_TECNICA').length}</strong></div>
        </div>

        <div className="form-grid cols-3" style={{ alignItems: 'end' }}>
          <div><label>Modalidad *</label><select className="input" value={modality} onChange={e => { setModality(e.target.value); setCurriculum(null); }}><option value="MEDIA_GENERAL">MEDIA GENERAL</option><option value="MEDIA_TECNICA">MEDIA TÉCNICA</option></select></div>
          <div><label>Código del plan *</label><select className="input" value={selectedId} onChange={e => { setSelectedId(e.target.value); setCurriculum(null); }}><option value="">Seleccione</option>{filtered.map((p:any)=><option key={p.id} value={p.id}>{p.code} · {p.optionName || p.name}{p.active?' · ASIGNADO':''}</option>)}</select></div>
          <div className="row-actions"><button type="button" className="btn secondary" disabled={!selectedId} onClick={() => selectedId && openCurriculum(selectedId)}><School size={16}/> Revisar malla</button><button type="button" className="btn" disabled={!selected || selected.active} onClick={() => selected && assign(selected)}><CheckCircle2 size={16}/>{selected?.active?'Ya asignado':'Asignar plan'}</button></div>
        </div>

        {selected && <div className="card" style={{ marginTop: 16, background: '#f7f9fc' }}>
          <div className="row-actions" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <span className="eyebrow">Plan seleccionado</span>
              <h2 style={{ margin: '4px 0 8px' }}>{selected.code} · {selected.optionName || selected.name}</h2>
              <p><strong>{modalityLabel(selected.modality)}</strong>{selected.specialtyName ? ` · ESPECIALIDAD ${selected.specialtyName}` : ''} · {selected.maxGrade} AÑOS</p>
              <p>{selected.hasMention ? <><strong>TIENE MENCIÓN:</strong> {(selected.mentions || []).filter((m:any)=>m.active).map((m:any)=>m.name).join(', ') || 'PENDIENTE DE DEFINIR'}</> : <strong>NO REQUIERE MENCIÓN</strong>}</p>
              <p className="muted">{selected.sourceReference || 'Sin referencia documental registrada.'}</p>
            </div>
            <span className={`status ${selected.active ? 'ok' : 'neutral'}`}>{selected.active ? 'ASIGNADO / ACTIVO' : 'DISPONIBLE / INACTIVO'}</span>
          </div>
          <div className="row-actions" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {!selected.active && <button type="button" className="btn" onClick={() => assign(selected)}><CheckCircle2 size={16}/> Asignar a ETIMA</button>}
            {selected.active && <button type="button" className="btn secondary" onClick={() => setActive(selected, false)}><Power size={16}/> Inactivar para nuevas matrículas</button>}
            <button type="button" className="btn secondary" onClick={() => openCurriculum(selected.id)}><ChevronRight size={16}/> Ver materias por año</button>
            {!selected.officialCatalog && Number(selected?._count?.enrollments || 0) === 0 && Number(selected?._count?.sections || 0) === 0 &&
              <button type="button" className="btn secondary" style={{ borderColor: '#b42318', color: '#b42318' }} onClick={() => deletePlan(selected)}><Trash2 size={16}/> Eliminar plan creado</button>}
          </div>
          {!selected.officialCatalog && (Number(selected?._count?.enrollments || 0) > 0 || Number(selected?._count?.sections || 0) > 0) &&
            <p className="muted" style={{ marginTop: 8 }}>Este plan fue incorporado manualmente, pero ya tiene uso académico. Por seguridad histórica no puede borrarse; solo puede inactivarse.</p>}
        </div>}
      </section>

      <section className="card form-section" style={{ marginBottom: 16 }}>
        <div className="section-head"><div>
          <span className="eyebrow">Paso alternativo · Código no catalogado</span>
          <h2>Incorporar un plan nuevo autorizado</h2>
          <p>Use este formulario únicamente si el Ministerio autoriza un código que todavía no esté en el catálogo. El código es único. El plan se crea INACTIVO y deberá completar su malla antes de asignarlo.</p>
          <p className="muted">Si comete un error, un plan creado manualmente puede eliminarse mientras no tenga secciones ni matrículas. Los planes del catálogo nacional nunca se borran: solo se activan o inactivan.</p>
        </div><CirclePlus size={24}/></div>
        <form className="form-grid cols-3" onSubmit={createPlan} style={{ alignItems: 'end' }}>
          <div><label>Modalidad *</label><select className="input" name="modality" value={manualModality} onChange={e => setManualModality(e.target.value)} required><option value="MEDIA_GENERAL">MEDIA GENERAL</option><option value="MEDIA_TECNICA">MEDIA TÉCNICA</option></select></div>
          <div><label>Código del plan *</label><input className="input" name="code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} placeholder="00000" required/></div>
          <div><label>Duración</label><div className="input read-only">{manualModality === 'MEDIA_TECNICA' ? '6 AÑOS' : '5 AÑOS'}</div></div>
          {manualModality === 'MEDIA_TECNICA' && <div><label>Especialidad *</label><input className="input uppercase" name="specialtyName" onInput={toUpperInput} placeholder="INDUSTRIAL" required/></div>}
          <div className="span-2"><label>Nombre completo oficial del plan / opción *</label><input className="input uppercase" name="optionName" onInput={toUpperInput} placeholder="DENOMINACIÓN OFICIAL COMPLETA" required/><small className="muted">El código identifica una sola opción académica. No se crean menciones adicionales dentro de un código existente.</small></div>
          <button className="btn" type="submit"><CirclePlus size={16}/> Crear plan y cargar malla</button>
        </form>
      </section>

      <section className="card form-section" style={{ marginBottom: 16 }}>
        <div className="section-head"><div>
          <span className="eyebrow">Planes creados por la institución</span>
          <h2>Administrar planes manuales</h2>
          <p>Los planes que no pertenecen al catálogo nacional aparecen aquí aunque estén inactivos. Puede corregir un error eliminándolos mientras todavía no tengan secciones ni matrículas.</p>
        </div><Trash2 size={24}/></div>

        {manualPlans.length === 0 ? <div className="info-banner"><div><strong>NO HAY PLANES MANUALES</strong><span>Todos los planes registrados actualmente pertenecen al catálogo nacional.</span></div></div> :
        <div className="table-wrap"><table><thead><tr><th>Código</th><th>Modalidad</th><th>Plan / opción</th><th>Estado</th><th>Uso académico</th><th>Acciones</th></tr></thead><tbody>
          {manualPlans.map((p:any) => {
            const enrollments = Number(p?._count?.enrollments || 0);
            const sections = Number(p?._count?.sections || 0);
            const canDelete = enrollments === 0 && sections === 0;
            return <tr key={p.id}>
              <td><strong>{p.code}</strong></td>
              <td>{modalityLabel(p.modality)}</td>
              <td><strong>{p.optionName || p.name}</strong>{p.specialtyName ? <div className="muted">{p.specialtyName}</div> : null}</td>
              <td><span className={`status ${p.active ? 'ok' : 'neutral'}`}>{p.active ? 'ACTIVO' : 'INACTIVO'}</span></td>
              <td>{sections} sección(es) · {enrollments} matrícula(s)</td>
              <td><div className="row-actions" style={{flexWrap:'wrap'}}>
                <button type="button" className="btn secondary mini-btn" onClick={() => openCurriculum(p.id)}>Malla</button>
                {p.active ? <button type="button" className="btn secondary mini-btn" onClick={() => setActive(p,false)}>Inactivar</button> : <button type="button" className="btn secondary mini-btn" onClick={() => assign(p)}>Activar</button>}
                {canDelete ? <button type="button" className="btn secondary mini-btn" style={{borderColor:'#b42318',color:'#b42318'}} onClick={() => deletePlan(p)}><Trash2 size={13}/> Eliminar</button> : <span className="muted">No se puede borrar: tiene histórico</span>}
              </div></td>
            </tr>
          })}
        </tbody></table></div>}
      </section>
    </> : <div className="warning-banner" style={{ marginBottom: 16 }}><div><strong>GESTIÓN RESTRINGIDA</strong><span>Solo un Administrador puede asignar, crear o modificar planes de estudio. Dirección y otros perfiles pueden consultar la oferta activa.</span></div></div>}

    <div className="section-title"><div><h2>Oferta académica de la institución</h2><p className="muted">Los planes activos son los únicos disponibles en creación de secciones y matrícula.</p></div></div>
    <div className="grid">
      {activeRows.length === 0 ? <div className="card">No hay planes activos.</div> : activeRows.map((p:any)=><div className="card" key={p.id}>
        <div className="row-actions" style={{justifyContent:'space-between'}}><span className="muted">Plan {p.code}</span><span className="status ok">ACTIVO</span></div>
        <h2>{p.optionName || p.name}</h2>
        <p><strong>{modalityLabel(p.modality)}</strong> · 1° a {p.maxGrade}° Año</p>
        {p.specialtyName && <p>Especialidad: <strong>{p.specialtyName}</strong></p>}
        {p.hasMention ? <p>Mención: <strong>{(p.mentions||[]).filter((m:any)=>m.active).map((m:any)=>m.name).join(', ') || 'PENDIENTE'}</strong></p> : <p className="muted">Este plan no requiere mención.</p>}
        <p className="muted">Título: {p.titleName}</p>
        <b>{p.subjects?.length || 0} asignaciones curriculares cargadas</b>
        <div className="row-actions" style={{marginTop:12}}><button type="button" className="btn secondary mini-btn" onClick={()=>openCurriculum(p.id)}>Malla</button>{canAdmin&&<button type="button" className="btn secondary mini-btn" onClick={()=>setActive(p,false)}>Inactivar</button>}</div>
      </div>)}
    </div>

    {curriculum && <section ref={curriculumRef} className="card form-section" style={{ marginTop: 18, scrollMarginTop: 20 }}>
      <div className="section-head"><div>
        <span className="eyebrow">Paso 2 · Soporte de Matrícula y Notas</span>
        <h2>Malla curricular · {curriculum.code} · {curriculum.optionName || curriculum.name}</h2>
        <p>{modalityLabel(curriculum.modality)} · {curriculum.maxGrade} años. Cada materia registrada aquí alimenta la asignación docente, evaluaciones, definitivas, materias pendientes y reportes.</p>
      </div><ShieldCheck size={25}/></div>

      <div className={curriculum.readiness?.ready ? 'success-banner' : 'warning-banner'} style={{ marginBottom: 14 }}><div>
        <strong>{curriculum.readiness?.ready ? 'MALLA COMPLETA PARA ACTIVACIÓN' : 'MALLA INCOMPLETA'}</strong>
        <span>{curriculum.readiness?.missingGrades?.length ? `Faltan materias en: ${curriculum.readiness.missingGrades.map((g:number)=>gradeLabel(g)).join(', ')}.` : 'Todos los años tienen materias activas.'} {curriculum.readiness?.missingMention ? 'El plan exige al menos una mención activa.' : ''}</span>
      </div></div>

      <div className="decision-grid" style={{ marginBottom: 14 }}>
        {countsByGrade.map(item => <div key={item.grade}><span>{gradeLabel(item.grade)}</span><strong>{item.count}</strong><small>materia(s)</small></div>)}
      </div>

      <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
        {Array.from({ length: curriculum.maxGrade || 1 }, (_, i) => i + 1).map(g => <button key={g} type="button" className={`btn ${grade === g ? '' : 'secondary'} mini-btn`} onClick={() => setGrade(g)}>{gradeLabel(g)}</button>)}
      </div>

      <div className="table-wrap"><table><thead><tr><th>Materia / área</th><th>Componente</th><th>Horas semanales</th><th>Horas anuales</th><th>Evaluación</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {gradeSubjects.length === 0 ? <tr><td colSpan={7}>Todavía no hay materias cargadas para {gradeLabel(grade)}.</td></tr> : gradeSubjects.map((r:any)=><tr key={r.id}>
          <td><strong>{r.subject?.name}</strong></td><td>{r.component || '—'}</td><td>{r.weeklyHours ?? '—'}</td><td>{r.annualHours ?? '—'}</td><td>{r.subject?.gradingType === 'ORIENTATION_LETTER' ? 'LITERAL' : 'NUMÉRICA'}</td><td><span className={`status ${r.active === false ? 'neutral' : 'ok'}`}>{r.active === false ? 'INACTIVA' : 'ACTIVA'}</span></td>
          <td>{canAdmin && (curriculum._count?.enrollments || 0) === 0 ? <div className="row-actions"><button type="button" className="btn secondary mini-btn" onClick={()=>editSubject(r)}><Pencil size={13}/> Editar</button><button type="button" className="btn secondary mini-btn" onClick={()=>toggleSubject(r)}>{r.active === false ? 'Activar' : 'Inactivar'}</button></div> : <span className="muted">Histórico protegido</span>}</td>
        </tr>)}
      </tbody></table></div>

      {canAdmin && (curriculum._count?.enrollments || 0) === 0 ? <>
        <form onSubmit={addSubject} className="form-grid cols-3" style={{ alignItems: 'end', marginTop: 16 }}>
          <div><label>Nueva materia para {gradeLabel(grade)} *</label><input className="input uppercase" name="name" onInput={toUpperInput} required/></div>
          <div><label>Componente / área</label><input className="input uppercase" name="component" onInput={toUpperInput} placeholder="FORMACIÓN GENERAL"/></div>
          <div><label>Tipo de evaluación *</label><select className="input" name="gradingType"><option value="NUMERIC">NUMÉRICA</option><option value="ORIENTATION_LETTER">LITERAL</option></select></div>
          <div><label>Horas semanales</label><input className="input" name="weeklyHours" type="number" min="1" max="60"/></div>
          <div><label>Horas anuales</label><input className="input" name="annualHours" type="number" min="1" max="3000"/></div>
          <button className="btn" type="submit"><CirclePlus size={16}/> Agregar materia</button>
        </form>

        {curriculum.hasMention && <div className="info-banner" style={{marginTop:16}}><div><strong>DENOMINACIÓN FIJA DEL PLAN</strong><span>La mención/opción está definida por el código del plan y no puede agregarse, renombrarse ni sustituirse manualmente.</span></div></div>}

        {!curriculum.active && <div className="row-actions" style={{ marginTop: 16 }}><button type="button" className="btn" disabled={!curriculum.readiness?.ready} onClick={()=>assign(curriculum)}><CheckCircle2 size={16}/> {curriculum.readiness?.ready ? 'Asignar plan a la institución' : 'Complete la malla antes de asignar'}</button></div>}
      </> : (curriculum._count?.enrollments || 0) > 0 && <div className="warning-banner" style={{ marginTop: 14 }}><div><strong>MALLA PROTEGIDA</strong><span>Este plan ya tiene estudiantes matriculados. Para preservar notas, definitivas y certificados, la malla no se modifica directamente. Una reforma curricular debe registrarse como una nueva versión autorizada.</span></div></div>}
    </section>}

    <div className="section-title"><div><h2>Referencias institucionales actuales</h2><p className="muted">Se conservan las imágenes de referencia de los planes utilizados originalmente por ETIMA.</p></div></div>
    <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}><div className="card"><img src="/brand/plan-31059.png" alt="Referencia plan 31059" style={{width:'100%',maxHeight:520,objectFit:'contain'}}/></div><div className="card"><img src="/brand/plan-41049.png" alt="Referencia plan 41049" style={{width:'100%',maxHeight:520,objectFit:'contain'}}/></div></div>
  </Shell>;
}
