'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarPlus, Copy, Plus, Power, School } from 'lucide-react';
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

  const activeSectionNames = useMemo(() => sectionNames.filter((x: any) => x.active), [sectionNames]);
  const selectedSectionPlan = useMemo(() => plans.find((x: any) => x.id === sectionPlanId), [plans, sectionPlanId]);
  const activeMentionsForPlan = useMemo(() => mentions.filter((x: any) => x.active && x.studyPlanId === sectionPlanId), [mentions, sectionPlanId]);

  async function load(preferred?: string) {
    try {
      const [y, p, names, mentionRows, user] = await Promise.all([
        api('/academic/years'),
        api('/academic/plans'),
        api('/academic/section-names'),
        api('/academic/mentions'),
        api('/auth/me'),
      ]);
      setYears(y);
      setPlans(p);
      setSectionNames(names);
      setMentions(mentionRows);
      setMe(user);
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
    } catch (e: any) { setErr(e.message); }
  }

  async function toggleMention(id: string, active: boolean) {
    try {
      await api(`/academic/mentions/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      setMsg(active ? 'Mención activada' : 'Mención inactivada');
      setErr('');
      setMentions(await api('/academic/mentions'));
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

  return <Shell title="Configuración de matrícula">
    <div className="page-heading">
      <div><span className="eyebrow">Administración anual</span><h1>Años escolares y secciones</h1><p>Configure el período destino antes de iniciar reinscripciones. El cierre de matrícula es automático cada 31 de octubre; los nombres de las secciones se administran desde un catálogo central.</p></div>
      <Link className="btn secondary" href="/enrollments"><ArrowLeft size={17}/> Volver</Link>
    </div>
    {msg && <div className="success-banner">{msg}</div>}
    {err && <div className="alert">{err}</div>}
    <div className="info-banner" style={{marginBottom:16}}><div><strong>CIERRE DE MATRÍCULA AUTOMÁTICO</strong><span>El 31 de octubre es el último día de matrícula ordinaria y la nómina permanece provisional durante todo ese día. Desde el 1 de noviembre queda fija automáticamente, sin intervención manual.</span></div></div>

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
        <div className="mini-list">{years.map(y => <div key={y.id}><div><strong>{y.name}</strong><small>{dateLabel(y.startDate)} – {dateLabel(y.endDate)} · Cierre automático {dateLabel(y.enrollmentCloseDate)} · {y._count?.enrollments || 0} matrícula(s)</small></div><div className="row-actions">{y.active ? <span className="status ok">ACTIVO</span> : <><button className="btn secondary" onClick={() => activate(y.id)}><Power size={14}/> Activar</button>{(y._count?.enrollments || 0) > 0 && <button className="btn secondary" onClick={() => inactivateYear(y.id, y.name)}>Pasar a Inactivo</button>}</>}</div></div>)}</div>
      </section>
    </div>

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
      <div className="section-head"><div><span className="eyebrow">Solo Administrador</span><h2>Catálogo de menciones</h2><p>Cada mención queda vinculada a un plan de estudio y, por medio de ese plan, a su modalidad. Media General 31059 utiliza BACHILLER y Media Técnica 41049 utiliza CIENCIAS AGRÍCOLAS Y PECUARIAS.</p></div><School size={22}/></div>
      <form onSubmit={createMention} className="form-grid cols-3" style={{alignItems:'end',marginBottom:16}}>
        <div><label>Plan de estudio *</label><select className="input" name="studyPlanId" required><option value="">Seleccione</option>{plans.map((p:any)=><option key={p.id} value={p.id}>{p.code} · {p.modality==='MEDIA_TECNICA'?'MEDIA TÉCNICA':'MEDIA GENERAL'} · {p.name}</option>)}</select></div>
        <div><label>Nombre de la mención *</label><input className="input uppercase" name="name" placeholder="BACHILLER" onInput={nameOnlyInput} required/></div>
        <button className="btn" type="submit" disabled={plans.length===0}><Plus size={16}/> Agregar mención</button>
      </form>
      <div className="table-wrap"><table><thead><tr><th>Modalidad</th><th>Plan</th><th>Mención</th><th>Estado</th><th>Secciones</th><th>Acciones</th></tr></thead><tbody>{mentions.length===0?<tr><td colSpan={6}>Todavía no hay menciones registradas.</td></tr>:mentions.map((m:any)=><tr key={m.id}><td><strong>{m.studyPlan?.modality==='MEDIA_TECNICA'?'MEDIA TÉCNICA':'MEDIA GENERAL'}</strong></td><td>{m.studyPlan?.code}</td><td><strong>{m.name}</strong></td><td><span className={`status ${m.active?'ok':'neutral'}`}>{m.active?'ACTIVA':'INACTIVA'}</span></td><td>{m._count?.sections||0}</td><td><div className="row-actions"><button className="btn secondary mini-btn" type="button" onClick={()=>renameMention(m)}>Renombrar</button><button className="btn secondary mini-btn" type="button" onClick={()=>toggleMention(m.id,!m.active)}>{m.active?'Inactivar':'Activar'}</button></div></td></tr>)}</tbody></table></div>
      <p className="muted" style={{marginTop:10}}>Las secciones históricas guardan una copia de la mención con la que fueron creadas. La modalidad se obtiene siempre del plan asociado.</p>
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
        {selectedSectionPlan && activeMentionsForPlan.length===0 && <div className="alert">El plan seleccionado no tiene una mención activa. Un Administrador debe registrar la mención correspondiente antes de crear la sección.</div>}
        <div className="form-grid">
          <div className="span-2"><label>Plan *</label><select className="input" value={sectionPlanId} onChange={e=>{setSectionPlanId(e.target.value);setSectionMentionId('')}} required>{plans.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></div>
          <div><label>Grado *</label><select className="input" name="gradeLevel">{Array.from({length:selectedSectionPlan?.maxGrade||1},(_,i)=>i+1).map(g => <option key={g} value={g}>{g}° AÑO</option>)}</select></div>
          <div><label>Modalidad</label><div className="input read-only">{selectedSectionPlan?.modality==='MEDIA_TECNICA'?'MEDIA TÉCNICA':'MEDIA GENERAL'}</div></div>
          <div><label>Mención *</label><select className="input" value={sectionMentionId} onChange={e=>setSectionMentionId(e.target.value)} required><option value="">Seleccione</option>{activeMentionsForPlan.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label>Nombre de sección *</label><select className="input" name="sectionNameId" required disabled={activeSectionNames.length===0}><option value="">Seleccione</option>{activeSectionNames.map((n:any) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
          <div><label>Turno *</label><select className="input" name="shift" required><option value="">Seleccione</option><option value="INTEGRAL">INTEGRAL</option><option value="MEDIO DÍA MAÑANA">MEDIO DÍA MAÑANA</option><option value="MEDIO DÍA TARDE">MEDIO DÍA TARDE</option></select></div>
          <div><label>Capacidad</label><input className="input" name="capacity" type="number" min="1"/></div>
        </div>
        <button className="btn" disabled={activeSectionNames.length===0 || !sectionMentionId}>Crear sección</button>
      </form>

      <section className="card"><h3>Secciones configuradas</h3><p className="muted">Hasta el 31 de octubre inclusive, la numeración es provisional y se determina por cédula. Desde el 1 de noviembre queda fija automáticamente; los retiros posteriores conservan su posición y toda matrícula posterior recibe el siguiente número al final por fecha de registro.</p><div className="table-wrap"><table><thead><tr><th>Modalidad</th><th>Plan</th><th>Grado</th><th>Mención</th><th>Sección</th><th>Turno</th><th>Matrículas</th><th>Nómina</th></tr></thead><tbody>{sections.length === 0 ? <tr><td colSpan={8}>No hay secciones configuradas.</td></tr> : sections.map(s => <tr key={s.id}><td>{s.studyPlan.modality==='MEDIA_TECNICA'?'MEDIA TÉCNICA':'MEDIA GENERAL'}</td><td>{s.studyPlan.code}</td><td>{s.gradeLevel}°</td><td>{s.mentionName || 'SIN DEFINIR'}</td><td>{s.name}</td><td>{s.shift || '—'}</td><td>{s._count?.enrollments || 0}</td><td>{s.rosterLockedAt ? <span className="status ok">FIJA</span> : closeReached(s) ? <span className="status ok">FIJA AUTOMÁTICA DESDE {rosterLockLabelFromClose(s.academicYear.enrollmentCloseDate)}</span> : <span className="status warn">PROVISIONAL HASTA {dateLabel(s.academicYear.enrollmentCloseDate)} INCLUSIVE</span>}</td></tr>)}</tbody></table></div></section>
    </div>
  </Shell>;
}
