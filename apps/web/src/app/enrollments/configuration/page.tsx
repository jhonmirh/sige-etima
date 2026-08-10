'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarPlus, CheckCircle2, Copy, Plus, Power, School, TriangleAlert } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { nameOnlyInput, toUpperInput } from '@/lib/formRules';
import { automaticCloseLabelFromStart, dateLabel, rosterLockDateKeyFromClose, rosterLockLabelFromClose, schoolDateKey } from '@/lib/schoolCalendar';

function closeReached(section: any) {
  const close = section?.academicYear?.enrollmentCloseDate;
  return !!close && schoolDateKey() >= rosterLockDateKeyFromClose(close);
}

export default function EnrollmentConfiguration() {
  const [years, setYears] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [catalogPlans, setCatalogPlans] = useState<any[]>([]);
  const [catalogModality, setCatalogModality] = useState('MEDIA_GENERAL');
  const [catalogPlanId, setCatalogPlanId] = useState('');
  const [manualPlanModality, setManualPlanModality] = useState('MEDIA_GENERAL');
  const [manualPlanHasMention, setManualPlanHasMention] = useState(false);
  const [curriculum, setCurriculum] = useState<any>(null);
  const [curriculumGrade, setCurriculumGrade] = useState(1);
  const [sections, setSections] = useState<any[]>([]);
  const [sectionNames, setSectionNames] = useState<any[]>([]);
  const [mentions, setMentions] = useState<any[]>([]);
  const [me, setMe] = useState<any>();
  const [yearId, setYearId] = useState('');
  const [sectionPlanId, setSectionPlanId] = useState('');
  const [sectionMentionId, setSectionMentionId] = useState('');
  const [cloneSourceId, setCloneSourceId] = useState('');
  const [newYearStartDate, setNewYearStartDate] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sectionNameMsg, setSectionNameMsg] = useState('');
  const [sectionNameErr, setSectionNameErr] = useState('');
  const [closure, setClosure] = useState<any>(null);
  const [closureLoading, setClosureLoading] = useState(false);

  const activeSectionNames = useMemo(() => sectionNames.filter((x: any) => x.active), [sectionNames]);
  const selectedSectionPlan = useMemo(() => plans.find((x: any) => x.id === sectionPlanId), [plans, sectionPlanId]);
  const activeMentionsForPlan = useMemo(() => mentions.filter((x: any) => x.active && x.studyPlanId === sectionPlanId), [mentions, sectionPlanId]);
  const catalogByModality = useMemo(() => catalogPlans.filter((x: any) => x.modality === catalogModality), [catalogPlans, catalogModality]);
  const selectedCatalogPlan = useMemo(() => catalogPlans.find((x: any) => x.id === catalogPlanId), [catalogPlans, catalogPlanId]);
  const curriculumSubjects = useMemo(() => (curriculum?.subjects || []).filter((x: any) => Number(x.gradeLevel) === curriculumGrade), [curriculum, curriculumGrade]);

  async function load(preferred?: string) {
    try {
      const [y, p, allPlans, names, mentionRows, user] = await Promise.all([
        api('/academic/years'),
        api('/academic/plans'),
        api('/academic/plans?all=true'),
        api('/academic/section-names'),
        api('/academic/mentions'),
        api('/auth/me'),
      ]);
      setYears(y);
      setPlans(p);
      setCatalogPlans(allPlans);
      setSectionNames(names);
      setMentions(mentionRows);
      setMe(user);
      const firstCatalog = allPlans.find((x:any)=>x.modality===catalogModality) || allPlans[0];
      setCatalogPlanId(prev => prev && allPlans.some((x:any)=>x.id===prev) ? prev : (firstCatalog?.id || ''));
      setSectionPlanId(prev => prev || p[0]?.id || '');
      const selected = preferred || yearId || y.find((x: any) => x.active)?.id || y[0]?.id || '';
      setYearId(selected);
      const cloneCandidate = y.find((x: any) => x.id !== selected)?.id || '';
      setCloneSourceId(prev => prev && prev !== selected ? prev : cloneCandidate);
      setSections(selected ? await api(`/academic/sections?academicYearId=${selected}`) : []);
      setErr('');
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (yearId) api(`/academic/sections?academicYearId=${yearId}`).then(setSections).catch((e: any) => setErr(e.message));
  }, [yearId]);
  useEffect(() => {
    if (yearId && (me?.role === 'ADMIN' || me?.role === 'DIRECTOR')) {
      setClosureLoading(true);
      api(`/academic/years/${yearId}/closure-readiness`).then(setClosure).catch((e: any) => setErr(e.message)).finally(() => setClosureLoading(false));
    } else setClosure(null);
  }, [yearId, me?.role]);

  useEffect(() => {
    const rows = catalogPlans.filter((x:any)=>x.modality===catalogModality);
    if (!rows.some((x:any)=>x.id===catalogPlanId)) {
      setCatalogPlanId(rows[0]?.id || '');
      setCurriculum(null);
      setCurriculumGrade(1);
    }
  }, [catalogModality, catalogPlans, catalogPlanId]);

  async function createYear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const y = await api('/academic/years', {
        method: 'POST',
        body: JSON.stringify({
          name: String(f.get('name') || '').toUpperCase(),
          startDate: f.get('startDate'),
          endDate: f.get('endDate'),
          contributionAmount: Number(f.get('contributionAmount') || 0),
          active: f.get('active') === 'on',
        }),
      });
      setMsg(`Año escolar ${y.name} creado · Cierre automático de matrícula: ${dateLabel(y.enrollmentCloseDate)}`);
      setErr('');
      form.reset();
      setNewYearStartDate('');
      await load(y.id);
    } catch (e: any) { setErr(e.message); }
  }

  async function createSectionName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setSectionNameMsg('');
    setSectionNameErr('');
    try {
      const created = await api('/academic/section-names', {
        method: 'POST',
        body: JSON.stringify({ name: String(f.get('name') || '').toLocaleUpperCase('es-VE') }),
      });
      const rows = await api('/academic/section-names');
      setSectionNames(rows);
      form.reset();
      const text = `Nombre de sección ${created?.name || ''} agregado correctamente`.trim();
      setSectionNameMsg(text);
      setMsg(text);
      setErr('');
    } catch (e: any) {
      const message = Array.isArray(e?.message) ? e.message.join(' · ') : String(e?.message || 'No fue posible agregar el nombre de sección');
      setSectionNameErr(message);
      setErr(message);
    }
  }

  async function toggleSectionName(id: string, active: boolean) {
    try {
      await api(`/academic/section-names/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      setMsg(active ? 'Nombre de sección activado' : 'Nombre de sección inactivado');
      setErr('');
      setSectionNames(await api('/academic/section-names'));
    } catch (e: any) { setErr(e.message); }
  }

  async function renameSectionName(item: any) {
    const value = window.prompt('Nuevo nombre de la sección', item.name);
    if (value === null) return;
    const name = value.trim().toLocaleUpperCase('es-VE');
    if (!name || name === item.name) return;
    try {
      await api(`/academic/section-names/${item.id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
      setMsg('Nombre del catálogo actualizado. Las secciones históricas ya creadas conservan su nombre original.');
      setErr('');
      setSectionNames(await api('/academic/section-names'));
    } catch (e: any) { setErr(e.message); }
  }

  async function refreshPlanCatalog(preferredId?: string) {
    const [activeRows, allRows, mentionRows] = await Promise.all([api('/academic/plans'), api('/academic/plans?all=true'), api('/academic/mentions')]);
    setPlans(activeRows);
    setCatalogPlans(allRows);
    setMentions(mentionRows);
    const selected = preferredId || catalogPlanId;
    if (selected) {
      setCatalogPlanId(selected);
      try { setCurriculum(await api(`/academic/plans/${selected}/curriculum`)); } catch {}
    }
  }

  async function createStudyPlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const hasMention = f.get('hasMention') === 'on';
    try {
      const created = await api('/academic/plans', {
        method: 'POST',
        body: JSON.stringify({
          modality: String(f.get('modality') || ''),
          code: String(f.get('code') || ''),
          specialtyName: String(f.get('specialtyName') || '') || undefined,
          optionName: String(f.get('optionName') || '').toLocaleUpperCase('es-VE'),
          hasMention,
          mentionName: hasMention ? String(f.get('mentionName') || '').toLocaleUpperCase('es-VE') : undefined,
        }),
      });
      setMsg(`Plan ${created.code} creado. Cargue las materias de cada año antes de activarlo.`);
      setErr('');
      form.reset();
      setManualPlanModality('MEDIA_GENERAL');
      setManualPlanHasMention(false);
      setCatalogModality(created.modality);
      setCatalogPlanId(created.id);
      setCurriculumGrade(1);
      await refreshPlanCatalog(created.id);
    } catch (e:any) { setErr(e.message); }
  }

  async function toggleStudyPlan(plan:any) {
    try {
      await api(`/academic/plans/${plan.id}/active`, { method:'PATCH', body:JSON.stringify({active:!plan.active}) });
      setMsg(plan.active ? `Plan ${plan.code} inactivado para nuevas secciones y matrículas.` : `Plan ${plan.code} activado para la institución.`);
      setErr('');
      await refreshPlanCatalog(plan.id);
    } catch (e:any) { setErr(e.message); }
  }

  async function openCurriculum(planId:string) {
    try {
      const data = await api(`/academic/plans/${planId}/curriculum`);
      setCatalogPlanId(planId);
      setCurriculum(data);
      setCurriculumGrade(1);
      setErr('');
    } catch (e:any) { setErr(e.message); }
  }

  async function addCurriculumSubject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!catalogPlanId) return;
    const form=e.currentTarget;
    const f=new FormData(form);
    try {
      await api(`/academic/plans/${catalogPlanId}/subjects`, {method:'POST',body:JSON.stringify({
        gradeLevel:curriculumGrade,
        name:String(f.get('name')||'').toLocaleUpperCase('es-VE'),
        weeklyHours:f.get('weeklyHours')?Number(f.get('weeklyHours')):undefined,
        annualHours:f.get('annualHours')?Number(f.get('annualHours')):undefined,
        component:String(f.get('component')||'').toLocaleUpperCase('es-VE')||undefined,
        gradingType:String(f.get('gradingType')||'NUMERIC'),
      })});
      setMsg(`Materia agregada a ${curriculumGrade}° AÑO del plan ${selectedCatalogPlan?.code||''}`);
      setErr('');
      form.reset();
      setCurriculum(await api(`/academic/plans/${catalogPlanId}/curriculum`));
      setCatalogPlans(await api('/academic/plans?all=true'));
    } catch (e:any) { setErr(e.message); }
  }

  async function toggleCurriculumSubject(row:any) {
    try {
      await api(`/academic/plan-subjects/${row.id}`, {method:'PATCH',body:JSON.stringify({active:row.active===false?true:false})});
      setCurriculum(await api(`/academic/plans/${catalogPlanId}/curriculum`));
      setMsg(row.active===false?'Materia activada':'Materia inactivada');
      setErr('');
    } catch (e:any) { setErr(e.message); }
  }

  async function createMention(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api('/academic/mentions', {
        method: 'POST',
        body: JSON.stringify({
          studyPlanId: String(f.get('studyPlanId') || ''),
          name: String(f.get('name') || '').toLocaleUpperCase('es-VE'),
        }),
      });
      setMsg('Mención agregada al catálogo académico');
      setErr('');
      form.reset();
      setMentions(await api('/academic/mentions'));
      setCatalogPlans(await api('/academic/plans?all=true'));
    } catch (e: any) { setErr(e.message); }
  }

  async function toggleMention(id: string, active: boolean) {
    try {
      await api(`/academic/mentions/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      setMsg(active ? 'Mención activada' : 'Mención inactivada');
      setErr('');
      setMentions(await api('/academic/mentions'));
      setCatalogPlans(await api('/academic/plans?all=true'));
    } catch (e: any) { setErr(e.message); }
  }

  async function renameMention(item: any) {
    const value = window.prompt('Nuevo nombre de la mención', item.name);
    if (value === null) return;
    const name = value.trim().toLocaleUpperCase('es-VE');
    if (!name || name === item.name) return;
    try {
      await api(`/academic/mentions/${item.id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
      setMsg('Nombre de la mención actualizado. Las secciones históricas conservan el nombre con el que fueron creadas.');
      setErr('');
      setMentions(await api('/academic/mentions'));
      setCatalogPlans(await api('/academic/plans?all=true'));
    } catch (e: any) { setErr(e.message); }
  }

  async function createSection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api('/academic/sections', {
        method: 'POST',
        body: JSON.stringify({
          academicYearId: yearId,
          studyPlanId: sectionPlanId,
          mentionId: sectionMentionId || undefined,
          gradeLevel: Number(f.get('gradeLevel')),
          sectionNameId: f.get('sectionNameId'),
          shift: f.get('shift') || undefined,
          capacity: f.get('capacity') ? Number(f.get('capacity')) : undefined,
        }),
      });
      setMsg('Sección creada');
      setErr('');
      form.reset();
      setSectionMentionId('');
      setSections(await api(`/academic/sections?academicYearId=${yearId}`));
    } catch (e: any) { setErr(e.message); }
  }

  async function activate(id: string) {
    try {
      await api(`/academic/years/${id}/activate`, { method: 'PATCH' });
      setMsg('Año escolar activado');
      setErr('');
      await load(id);
    } catch (e: any) { setErr(e.message); }
  }

  async function clone() {
    const source = years.find(x => x.id === cloneSourceId);
    if (!source) return;
    try {
      await api(`/academic/years/${yearId}/clone-sections`, { method: 'POST', body: JSON.stringify({ sourceAcademicYearId: source.id }) });
      setMsg(`Secciones clonadas desde ${source.name}`);
      setErr('');
      setSections(await api(`/academic/sections?academicYearId=${yearId}`));
    } catch (e: any) { setErr(e.message); }
  }


  async function inactivateYear(id: string, name: string) {
    if (!confirm(`¿Pasar las matrículas activas de ${name} a condición INACTIVO? La definitiva académica se conservará separadamente.`)) return;
    try {
      const r = await api(`/enrollments/year/${id}/inactivate`, { method: 'POST' });
      setMsg(`${r.count} matrícula(s) pasadas a INACTIVO`);
      setErr('');
      await load(yearId);
    } catch (e: any) { setErr(e.message); }
  }


  async function refreshClosure() {
    if (!yearId) return;
    setClosureLoading(true);
    try { setClosure(await api(`/academic/years/${yearId}/closure-readiness`)); setErr(''); }
    catch (e: any) { setErr(e.message); }
    finally { setClosureLoading(false); }
  }

  async function finalizeAcademicYear() {
    const year = years.find((x: any) => x.id === yearId);
    if (!year || !closure?.ready) return;
    if (!confirm(`¿FINALIZAR ACADÉMICAMENTE EL AÑO ESCOLAR ${year.name}?\n\nEsta acción consolidará la condición de cada estudiante según sus definitivas y habilitará la reinscripción al período siguiente.`)) return;
    try {
      const result = await api(`/academic/years/${yearId}/finalize`, { method: 'POST' });
      setClosure(result);
      setMsg(`Año escolar ${year.name} finalizado académicamente. La reinscripción al siguiente período ya puede utilizar sus resultados.`);
      setErr('');
      await load(yearId);
    } catch (e: any) { setErr(e.message); }
  }

  return <Shell title="Configuración de matrícula">
    <div className="page-heading">
      <div><span className="eyebrow">Administración académica</span><h1>Años escolares, planes y secciones</h1><p>Active los planes autorizados para la institución, gestione su malla curricular y configure las secciones del período. El cierre de matrícula es automático cada 31 de octubre.</p></div>
      <Link className="btn secondary" href="/enrollments"><ArrowLeft size={17}/> Volver</Link>
    </div>
    {msg && <div className="success-banner">{msg}</div>}
    {err && <div className="alert">{err}</div>}
    <div className="info-banner" style={{marginBottom:16}}><div><strong>CIERRE DE MATRÍCULA AUTOMÁTICO</strong><span>El 31 de octubre es el último día de matrícula ordinaria y la nómina permanece provisional durante todo ese día. Desde el 1 de noviembre queda fija automáticamente, sin intervención manual.</span></div></div>

    {me?.role === 'ADMIN' && <section className="card form-section" style={{marginBottom:16,border:'2px solid #174a8b'}}>
      <div className="section-head"><div><span className="eyebrow">Gestión académica</span><h2>¿Necesita asignar un nuevo plan de estudio?</h2><p>La gestión completa de planes ahora tiene una pantalla dedicada: catálogo oficial, activación institucional, creación de códigos nuevos, menciones y materias por cada año.</p></div><School size={23}/></div>
      <div className="row-actions"><Link className="btn" href="/plans"><Plus size={16}/> Asignar / incorporar plan</Link><span className="muted">Media General: 5 años · Media Técnica: 6 años.</span></div>
    </section>}

    <div className="details-grid">
      <form className="card form-section" onSubmit={createYear}>
        <div className="section-head"><div><h2>Nuevo año escolar</h2><p>Al crearlo se genera su política de calificaciones, los tres lapsos base y el cierre automático de matrícula para el 31 de octubre del año de inicio.</p></div><CalendarPlus size={22}/></div>
        <div className="form-grid">
          <div className="span-2"><label>Nombre *</label><input className="input uppercase" name="name" placeholder="2027-2028" onInput={toUpperInput} required/></div>
          <div><label>Inicio *</label><input className="input" type="date" name="startDate" value={newYearStartDate} onChange={e=>setNewYearStartDate(e.target.value)} required/></div>
          <div><label>Culminación *</label><input className="input" type="date" name="endDate" required/></div>
          <div><label>Cierre de matrícula</label><input className="input" value={`${automaticCloseLabelFromStart(newYearStartDate)} · AUTOMÁTICO`} readOnly aria-readonly="true"/><small className="muted">Regla institucional fija: último día de octubre.</small></div>
          <div><label>Aporte de inscripción</label><input className="input" type="number" name="contributionAmount" min="0" step="0.01" defaultValue="0" required/></div>
          <label className="check-card span-2"><input type="checkbox" name="active"/><span><strong>Activar al crear</strong><small>Desactiva el período activo anterior.</small></span></label>
        </div>
        <button className="btn"><CalendarPlus size={17}/> Crear año escolar</button>
      </form>

      <section className="card form-section">
        <div className="section-head"><div><h2>Períodos existentes</h2><p>Solo un año escolar debe estar activo.</p></div></div>
        <div className="mini-list">{years.map(y => <div key={y.id}><div><strong>{y.name}</strong><small>{dateLabel(y.startDate)} – {dateLabel(y.endDate)} · Cierre automático {dateLabel(y.enrollmentCloseDate)} · {y._count?.enrollments || 0} matrícula(s){y.academicClosedAt?` · Finalizado ${dateLabel(y.academicClosedAt)}`:''}</small></div><div className="row-actions">{y.academicClosedAt ? <><span className="status ok">AÑO FINALIZADO</span>{(y._count?.enrollments || 0)>0&&<button className="btn secondary" onClick={() => inactivateYear(y.id, y.name)}>Pasar a Inactivo</button>}</> : y.active ? <span className="status ok">ACTIVO</span> : <button className="btn secondary" onClick={() => activate(y.id)}><Power size={14}/> Activar</button>}</div></div>)}</div>
      </section>
    </div>

    {(me?.role === 'ADMIN' || me?.role === 'DIRECTOR') && <section className="card form-section" style={{marginTop:16}}>
      <div className="section-head"><div><span className="eyebrow">Dirección / Administración</span><h2>Cierre académico del año escolar</h2><p>La finalización académica es distinta al cierre de matrícula del 31 de octubre. Solo después de este cierre se habilita la reinscripción basada en definitivas.</p></div>{closure?.alreadyClosed?<CheckCircle2 size={24}/>:<TriangleAlert size={24}/>}</div>
      <div className="row-actions" style={{marginBottom:14}}><select className="input" value={yearId} onChange={e=>setYearId(e.target.value)}>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><button type="button" className="btn secondary" onClick={refreshClosure} disabled={closureLoading}>{closureLoading?'Revisando…':'Revisar estado'}</button></div>
      {closureLoading?<p className="muted">Verificando definitivas y materias pendientes…</p>:closure&&<>
        {closure.alreadyClosed?<div className="success-banner"><div><strong>AÑO ESCOLAR FINALIZADO</strong><span>{dateLabel(closure.year.academicClosedAt)} · {closure.year.academicClosedBy||'USUARIO REGISTRADO'}. La reinscripción al período siguiente puede utilizar estas definitivas.</span></div></div>:<>
          <div className="decision-grid" style={{marginBottom:14}}><div><span>Matrículas totales</span><strong>{closure.counts.totalMatriculados}</strong></div><div><span>Evaluables</span><strong>{closure.counts.evaluables}</strong></div><div><span>Listas para cerrar</span><strong>{closure.counts.listos}</strong></div><div><span>Con pendientes</span><strong>{closure.counts.pendientes}</strong></div><div><span>Retirados excluidos</span><strong>{closure.counts.retirados}</strong></div></div>
          {closure.ready?<><div className="success-banner"><div><strong>LISTO PARA FINALIZAR</strong><span>REGULAR: {closure.counts.regular} · MATERIA PENDIENTE: {closure.counts.materiaPendiente} · REPITIENTE: {closure.counts.repitiente} · GRADUADO: {closure.counts.graduado}</span></div></div><div className="action-bar"><button type="button" className="btn" onClick={finalizeAcademicYear}><CheckCircle2 size={17}/> Finalizar año escolar</button></div></>:<div className="warning-banner"><TriangleAlert size={20}/><div><strong>NO SE PUEDE FINALIZAR</strong><span>Hay {closure.counts.pendientes} estudiante(s) con definitivas incompletas o materias pendientes sin resolver.</span></div></div>}
          {closure.blockers?.length>0&&<div className="table-wrap" style={{marginTop:14}}><table><thead><tr><th>Estudiante</th><th>Grado / sección</th><th>Motivo</th></tr></thead><tbody>{closure.blockers.slice(0,20).map((b:any)=><tr key={b.enrollmentId}><td><strong>{b.student}</strong><br/><small>{b.identityNumber?`V/E-${b.identityNumber}`:'SIN CÉDULA'}</small></td><td>{b.gradeLevel}° · {b.section}</td><td>{b.reasons.join(' · ')}</td></tr>)}</tbody></table>{closure.blockers.length>20&&<p className="muted">Se muestran los primeros 20 de {closure.blockers.length} casos pendientes.</p>}</div>}
        </>}
      </>}
    </section>}

    {me?.role === 'ADMIN' && <section className="card form-section" style={{marginTop:16}}>
      <div className="section-head"><div><span className="eyebrow">Solo Administrador</span><h2>Catálogo de nombres de secciones</h2><p>Registre aquí los nombres permitidos. Después, Dirección o Administración podrán seleccionarlos al crear una sección para cada año escolar.</p></div><School size={22}/></div>
      <form onSubmit={createSectionName} className="row-actions" style={{alignItems:'end',marginBottom:16}}>
        <div style={{flex:1}}><label>Nuevo nombre de sección *</label><input className="input uppercase" name="name" placeholder="ANDRÉS BELLO" onInput={nameOnlyInput} required/></div>
        <button className="btn" type="submit"><Plus size={16}/> Agregar nombre</button>
      </form>
      {sectionNameMsg && <div className="success-banner" style={{marginBottom:12}}>{sectionNameMsg}</div>}
      {sectionNameErr && <div className="alert" style={{marginBottom:12}}><strong>No se pudo agregar el nombre.</strong><br/>{sectionNameErr}</div>}
      <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{sectionNames.length === 0 ? <tr><td colSpan={3}>Todavía no hay nombres de secciones registrados.</td></tr> : sectionNames.map((n:any) => <tr key={n.id}><td><strong>{n.name}</strong></td><td><span className={`status ${n.active?'ok':'neutral'}`}>{n.active?'ACTIVO':'INACTIVO'}</span></td><td><div className="row-actions"><button className="btn secondary mini-btn" type="button" onClick={() => renameSectionName(n)}>Renombrar</button><button className="btn secondary mini-btn" type="button" onClick={() => toggleSectionName(n.id,!n.active)}>{n.active?'Inactivar':'Activar'}</button></div></td></tr>)}</tbody></table></div>
      <p className="muted" style={{marginTop:10}}>Inactivar un nombre impide usarlo en nuevas secciones, pero no modifica las secciones ni matrículas históricas ya creadas.</p>
    </section>}

    {me?.role === 'ADMIN' && <section className="card form-section" style={{marginTop:16}}>
      <div className="section-head"><div><span className="eyebrow">Solo Administrador</span><h2>Catálogo nacional de planes de estudio</h2><p>Seleccione la modalidad y el código oficial que utiliza la institución. Los planes inactivos permanecen disponibles en el catálogo, pero no aparecen al crear secciones ni matrículas hasta ser activados.</p></div><School size={22}/></div>
      <div className="form-grid cols-3" style={{alignItems:'end',marginBottom:16}}>
        <div><label>Modalidad *</label><select className="input" value={catalogModality} onChange={e=>{setCatalogModality(e.target.value);setCurriculum(null)}}><option value="MEDIA_GENERAL">MEDIA GENERAL</option><option value="MEDIA_TECNICA">MEDIA TÉCNICA</option></select></div>
        <div><label>Código / plan disponible *</label><select className="input" value={catalogPlanId} onChange={e=>{setCatalogPlanId(e.target.value);setCurriculum(null)}}><option value="">Seleccione</option>{catalogByModality.map((p:any)=><option key={p.id} value={p.id}>{p.code} · {p.optionName || p.name}{p.active?' · ACTIVO':''}</option>)}</select></div>
        <button className="btn secondary" type="button" disabled={!catalogPlanId} onClick={()=>catalogPlanId&&openCurriculum(catalogPlanId)}>Ver / gestionar malla</button>
      </div>
      {selectedCatalogPlan && <div className="info-banner" style={{marginBottom:16}}><div><strong>{selectedCatalogPlan.code} · {selectedCatalogPlan.optionName || selectedCatalogPlan.name}</strong><span>{selectedCatalogPlan.modality==='MEDIA_TECNICA'?`MEDIA TÉCNICA · ESPECIALIDAD ${selectedCatalogPlan.specialtyName || 'SIN DEFINIR'} · 6 AÑOS`:'MEDIA GENERAL · 5 AÑOS'} · {selectedCatalogPlan.hasMention?`TIENE MENCIÓN: ${(selectedCatalogPlan.mentions||[]).map((m:any)=>m.name).join(', ') || 'PENDIENTE DE DEFINIR'}`:'SIN MENCIÓN'} · {selectedCatalogPlan.officialCatalog?'CATÁLOGO PRECARGADO':'INCORPORADO MANUALMENTE'}.</span><span>{selectedCatalogPlan.sourceReference || 'Sin referencia documental registrada.'}</span></div><div className="row-actions"><span className={`status ${selectedCatalogPlan.active?'ok':'neutral'}`}>{selectedCatalogPlan.active?'ACTIVO':'INACTIVO'}</span><button className="btn secondary mini-btn" type="button" onClick={()=>toggleStudyPlan(selectedCatalogPlan)}>{selectedCatalogPlan.active?'Inactivar plan':'Activar plan'}</button></div></div>}
      <div className="table-wrap"><table><thead><tr><th>Código</th><th>Modalidad / especialidad</th><th>Opción / mención</th><th>Años</th><th>Materias</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{catalogByModality.length===0?<tr><td colSpan={7}>No hay planes registrados para esta modalidad.</td></tr>:catalogByModality.map((p:any)=><tr key={p.id}><td><strong>{p.code}</strong></td><td>{p.modality==='MEDIA_TECNICA'?<><strong>MEDIA TÉCNICA</strong><br/><small>{p.specialtyName || 'ESPECIALIDAD SIN DEFINIR'}</small></>:<strong>MEDIA GENERAL</strong>}</td><td><strong>{p.optionName || p.name}</strong>{p.hasMention&&<><br/><small>{(p.mentions||[]).filter((m:any)=>m.active).map((m:any)=>m.name).join(', ') || 'MENCIÓN PENDIENTE'}</small></>}</td><td>{p.maxGrade}</td><td>{p.subjects?.length || 0}</td><td><span className={`status ${p.active?'ok':'neutral'}`}>{p.active?'ACTIVO':'INACTIVO'}</span></td><td><div className="row-actions"><button className="btn secondary mini-btn" type="button" onClick={()=>openCurriculum(p.id)}>Malla</button><button className="btn secondary mini-btn" type="button" onClick={()=>toggleStudyPlan(p)}>{p.active?'Inactivar':'Activar'}</button></div></td></tr>)}</tbody></table></div>
      <p className="muted" style={{marginTop:10}}>El código identifica un plan de estudio único. Media General trabaja con cinco años; Media Técnica, con seis. Inactivar un plan impide usarlo en nuevas secciones y matrículas, pero conserva íntegro el histórico.</p>
    </section>}

    {me?.role === 'ADMIN' && <section className="card form-section" style={{marginTop:16}}>
      <div className="section-head"><div><span className="eyebrow">Plan no incluido en el catálogo</span><h2>Incorporar opción / plan de estudio</h2><p>Úselo solamente cuando la institución reciba autorización para un código que no se encuentre precargado. El plan nace INACTIVO y solo podrá activarse después de cargar materias en todos sus años.</p></div><Plus size={22}/></div>
      <form onSubmit={createStudyPlan} className="form-grid cols-3" style={{alignItems:'end'}}>
        <div><label>Modalidad *</label><select className="input" name="modality" value={manualPlanModality} onChange={e=>setManualPlanModality(e.target.value)} required><option value="MEDIA_GENERAL">MEDIA GENERAL</option><option value="MEDIA_TECNICA">MEDIA TÉCNICA</option></select></div>
        <div><label>Código del plan *</label><input className="input" name="code" inputMode="numeric" maxLength={5} pattern="[0-9]{5}" placeholder="00000" required/></div>
        <div><label>Nombre de la opción / plan *</label><input className="input uppercase" name="optionName" onInput={toUpperInput} placeholder={manualPlanModality==='MEDIA_TECNICA'?'ELECTRICIDAD':'BACHILLER'} required/></div>
        <div><label>Especialidad {manualPlanModality==='MEDIA_TECNICA'?'*':''}</label><input className="input uppercase" name="specialtyName" onInput={toUpperInput} placeholder="INDUSTRIAL" required={manualPlanModality==='MEDIA_TECNICA'} disabled={manualPlanModality!=='MEDIA_TECNICA'}/></div>
        <div className="check-card"><input id="manualHasMention" type="checkbox" name="hasMention" checked={manualPlanHasMention} onChange={e=>setManualPlanHasMention(e.target.checked)}/><label htmlFor="manualHasMention"><strong>¿Tiene mención?</strong><span>Actívelo cuando el plan requiere una mención u opción académica asociada.</span></label></div>
        <div><label>Nombre de la mención {manualPlanHasMention?'*':''}</label><input className="input uppercase" name="mentionName" onInput={toUpperInput} disabled={!manualPlanHasMention} required={manualPlanHasMention} placeholder="NOMBRE DE LA MENCIÓN"/></div>
        <button className="btn" type="submit"><Plus size={16}/> Crear plan inactivo</button>
      </form>
    </section>}

    {me?.role === 'ADMIN' && curriculum && <section className="card form-section" style={{marginTop:16}}>
      <div className="section-head"><div><span className="eyebrow">Soporte directo para Notas</span><h2>Malla curricular · {curriculum.code} · {curriculum.optionName || curriculum.name}</h2><p>Las materias activas de cada año alimentan Matrícula, carga docente, evaluaciones, definitivas, materia pendiente y reportes académicos.</p></div><School size={22}/></div>
      <div className="row-actions" style={{marginBottom:14,flexWrap:'wrap'}}>{Array.from({length:curriculum.maxGrade||1},(_,i)=>i+1).map((g:number)=><button key={g} type="button" className={`btn ${curriculumGrade===g?'':'secondary'} mini-btn`} onClick={()=>setCurriculumGrade(g)}>{g}° AÑO</button>)}</div>
      {curriculum.readiness && <div className={curriculum.readiness.ready?'success-banner':'warning-banner'} style={{marginBottom:14}}><div><strong>{curriculum.readiness.ready?'MALLA COMPLETA PARA ACTIVACIÓN':'MALLA INCOMPLETA'}</strong><span>{curriculum.readiness.missingGrades?.length?`Faltan materias en: ${curriculum.readiness.missingGrades.map((g:number)=>`${g}° AÑO`).join(', ')}.`:'Todos los años tienen materias.'} {curriculum.readiness.missingMention?'Falta una mención activa.':''}</span></div></div>}
      <div className="table-wrap"><table><thead><tr><th>Materia / área de formación</th><th>Componente</th><th>Horas semanales</th><th>Horas anuales</th><th>Evaluación</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{curriculumSubjects.length===0?<tr><td colSpan={7}>Todavía no hay materias cargadas para {curriculumGrade}° AÑO.</td></tr>:curriculumSubjects.map((r:any)=><tr key={r.id}><td><strong>{r.subject?.name}</strong></td><td>{r.component || '—'}</td><td>{r.weeklyHours ?? '—'}</td><td>{r.annualHours ?? '—'}</td><td>{r.subject?.gradingType==='ORIENTATION_LETTER'?'LITERAL':'NUMÉRICA'}</td><td><span className={`status ${r.active===false?'neutral':'ok'}`}>{r.active===false?'INACTIVA':'ACTIVA'}</span></td><td>{(curriculum._count?.enrollments||0)===0?<button className="btn secondary mini-btn" type="button" onClick={()=>toggleCurriculumSubject(r)}>{r.active===false?'Activar':'Inactivar'}</button>:<span className="muted">Histórico protegido</span>}</td></tr>)}</tbody></table></div>
      {(curriculum._count?.enrollments||0)===0 ? <form onSubmit={addCurriculumSubject} className="form-grid cols-3" style={{alignItems:'end',marginTop:16}}>
        <div><label>Nueva materia para {curriculumGrade}° Año *</label><input className="input uppercase" name="name" onInput={toUpperInput} required/></div>
        <div><label>Componente</label><input className="input uppercase" name="component" onInput={toUpperInput} placeholder="FORMACIÓN GENERAL"/></div>
        <div><label>Tipo de evaluación *</label><select className="input" name="gradingType"><option value="NUMERIC">NUMÉRICA</option><option value="ORIENTATION_LETTER">LITERAL</option></select></div>
        <div><label>Horas semanales</label><input className="input" name="weeklyHours" type="number" min="1" max="60"/></div>
        <div><label>Horas anuales</label><input className="input" name="annualHours" type="number" min="1" max="3000"/></div>
        <button className="btn" type="submit"><Plus size={16}/> Agregar materia</button>
      </form> : <div className="warning-banner" style={{marginTop:14}}><div><strong>MALLA PROTEGIDA</strong><span>Este plan ya tiene estudiantes matriculados. Para no alterar calificaciones ni históricos, sus materias no se modifican directamente; una modificación curricular debe manejarse como una nueva versión autorizada.</span></div></div>}
    </section>}

    {me?.role === 'ADMIN' && <section className="card form-section" style={{marginTop:16}}>
      <div className="section-head"><div><span className="eyebrow">Solo cuando el plan lo requiera</span><h2>Catálogo de menciones</h2><p>Las menciones se administran únicamente para planes ACTIVOS de la institución configurados con “Tiene mención”. Los planes precargados permanecen INACTIVOS hasta que Administración decida activarlos.</p></div><School size={22}/></div>
      <form onSubmit={createMention} className="form-grid cols-3" style={{alignItems:'end',marginBottom:16}}>
        <div><label>Plan de estudio *</label><select className="input" name="studyPlanId" required><option value="">Seleccione</option>{catalogPlans.filter((p:any)=>p.active && p.hasMention).map((p:any)=><option key={p.id} value={p.id}>{p.code} · {p.modality==='MEDIA_TECNICA'?'MEDIA TÉCNICA':'MEDIA GENERAL'} · {p.optionName || p.name}</option>)}</select></div>
        <div><label>Nombre de la mención *</label><input className="input uppercase" name="name" placeholder="CIENCIA Y TECNOLOGÍA" onInput={toUpperInput} required/></div>
        <button className="btn" type="submit" disabled={catalogPlans.filter((p:any)=>p.active && p.hasMention).length===0}><Plus size={16}/> Agregar mención</button>
      </form>
      <div className="table-wrap"><table><thead><tr><th>Modalidad</th><th>Plan</th><th>Mención</th><th>Estado</th><th>Secciones</th><th>Acciones</th></tr></thead><tbody>{mentions.filter((m:any)=>m.studyPlan?.active && m.studyPlan?.hasMention).length===0?<tr><td colSpan={6}>Todavía no hay menciones registradas para planes que las requieran.</td></tr>:mentions.filter((m:any)=>m.studyPlan?.active && m.studyPlan?.hasMention).map((m:any)=><tr key={m.id}><td><strong>{m.studyPlan?.modality==='MEDIA_TECNICA'?'MEDIA TÉCNICA':'MEDIA GENERAL'}</strong></td><td>{m.studyPlan?.code}</td><td><strong>{m.name}</strong></td><td><span className={`status ${m.active?'ok':'neutral'}`}>{m.active?'ACTIVA':'INACTIVA'}</span></td><td>{m._count?.sections||0}</td><td><div className="row-actions"><button className="btn secondary mini-btn" type="button" onClick={()=>renameMention(m)}>Renombrar</button><button className="btn secondary mini-btn" type="button" onClick={()=>toggleMention(m.id,!m.active)}>{m.active?'Inactivar':'Activar'}</button></div></td></tr>)}</tbody></table></div>
      <p className="muted" style={{marginTop:10}}>Las secciones históricas conservan la mención con la que fueron creadas. Un plan configurado sin mención no exige este dato al crear secciones ni matrículas.</p>
    </section>}

    {me && me.role !== 'ADMIN' && <div className="warning-banner" style={{marginTop:16}}><div><strong>CATÁLOGO DE SECCIONES ADMINISTRADO CENTRALMENTE</strong><span>Los nombres nuevos deben ser incorporados por un usuario con rol ADMINISTRADOR. Los nombres activos quedan disponibles para Dirección al crear secciones.</span></div></div>}

    <div className="section-title">
      <div><h2>Secciones del período</h2><p className="muted">La reinscripción sugiere el mismo nombre de sección cuando existe en el nuevo grado.</p></div>
      <div className="row-actions"><select className="input" value={yearId} onChange={e => {setYearId(e.target.value); if (cloneSourceId === e.target.value) setCloneSourceId(years.find((x:any) => x.id !== e.target.value)?.id || '');}}>{years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select>{years.length > 1 && <select className="input" value={cloneSourceId} onChange={e => setCloneSourceId(e.target.value)}><option value="">Año origen</option>{years.filter((y:any) => y.id !== yearId).map((y:any) => <option key={y.id} value={y.id}>Copiar desde {y.name}</option>)}</select>}<button className="btn secondary" onClick={clone} disabled={!cloneSourceId}><Copy size={16}/> Clonar secciones</button></div>
    </div>

    <div className="details-grid">
      <form className="card form-section" onSubmit={createSection}>
        <div className="section-head"><div><h3>Crear sección</h3><p>Seleccione un nombre previamente autorizado en el catálogo administrativo.</p></div><School size={22}/></div>
        {activeSectionNames.length === 0 && <div className="alert">No hay nombres activos en el catálogo de secciones. Un Administrador debe registrar al menos uno antes de crear nuevas secciones.</div>}
        {selectedSectionPlan?.hasMention && activeMentionsForPlan.length===0 && <div className="alert">El plan seleccionado requiere mención y no tiene una activa. Un Administrador debe registrar o activar la mención correspondiente antes de crear la sección.</div>}
        <div className="form-grid">
          <div className="span-2"><label>Plan *</label><select className="input" value={sectionPlanId} onChange={e=>{setSectionPlanId(e.target.value);setSectionMentionId('')}} required>{plans.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></div>
          <div><label>Grado *</label><select className="input" name="gradeLevel">{Array.from({length:selectedSectionPlan?.maxGrade||1},(_,i)=>i+1).map(g => <option key={g} value={g}>{g}° AÑO</option>)}</select></div>
          <div><label>Modalidad</label><div className="input read-only">{selectedSectionPlan?.modality==='MEDIA_TECNICA'?'MEDIA TÉCNICA':'MEDIA GENERAL'}</div></div>
          <div><label>Mención {selectedSectionPlan?.hasMention?'*':''}</label>{selectedSectionPlan?.hasMention?<select className="input" value={sectionMentionId} onChange={e=>setSectionMentionId(e.target.value)} required><option value="">Seleccione</option>{activeMentionsForPlan.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select>:<div className="input read-only">NO APLICA PARA ESTE PLAN</div>}</div>
          <div><label>Nombre de sección *</label><select className="input" name="sectionNameId" required disabled={activeSectionNames.length===0}><option value="">Seleccione</option>{activeSectionNames.map((n:any) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
          <div><label>Turno *</label><select className="input" name="shift" required><option value="">Seleccione</option><option value="INTEGRAL">INTEGRAL</option><option value="MEDIO DÍA MAÑANA">MEDIO DÍA MAÑANA</option><option value="MEDIO DÍA TARDE">MEDIO DÍA TARDE</option></select></div>
          <div><label>Capacidad</label><input className="input" name="capacity" type="number" min="1"/></div>
        </div>
        <button className="btn" disabled={activeSectionNames.length===0 || !!(selectedSectionPlan?.hasMention && !sectionMentionId)}>Crear sección</button>
      </form>

      <section className="card"><h3>Secciones configuradas</h3><p className="muted">Hasta el 31 de octubre inclusive, la numeración es provisional y se determina por cédula. Desde el 1 de noviembre queda fija automáticamente; los retiros posteriores conservan su posición y toda matrícula posterior recibe el siguiente número al final por fecha de registro.</p><div className="table-wrap"><table><thead><tr><th>Modalidad</th><th>Plan</th><th>Grado</th><th>Mención</th><th>Sección</th><th>Turno</th><th>Matrículas</th><th>Nómina</th></tr></thead><tbody>{sections.length === 0 ? <tr><td colSpan={8}>No hay secciones configuradas.</td></tr> : sections.map(s => <tr key={s.id}><td>{s.studyPlan.modality==='MEDIA_TECNICA'?'MEDIA TÉCNICA':'MEDIA GENERAL'}</td><td>{s.studyPlan.code}</td><td>{s.gradeLevel}°</td><td>{s.studyPlan?.hasMention ? (s.mentionName || 'SIN DEFINIR') : 'NO APLICA'}</td><td>{s.name}</td><td>{s.shift || '—'}</td><td>{s._count?.enrollments || 0}</td><td>{s.rosterLockedAt ? <span className="status ok">FIJA</span> : closeReached(s) ? <span className="status ok">FIJA AUTOMÁTICA DESDE {rosterLockLabelFromClose(s.academicYear.enrollmentCloseDate)}</span> : <span className="status warn">PROVISIONAL HASTA {dateLabel(s.academicYear.enrollmentCloseDate)} INCLUSIVE</span>}</td></tr>)}</tbody></table></div></section>
    </div>
  </Shell>;
}
