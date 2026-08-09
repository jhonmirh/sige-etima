'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarPlus, Copy, Plus, Power, School } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { nameOnlyInput, toUpperInput } from '@/lib/formRules';
import { automaticCloseLabelFromStart, dateLabel, schoolDateKey, storedDateKey } from '@/lib/schoolCalendar';

function closeReached(section: any) {
  const close = section?.academicYear?.enrollmentCloseDate;
  return !!close && schoolDateKey() >= storedDateKey(close);
}

export default function EnrollmentConfiguration() {
  const [years, setYears] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sectionNames, setSectionNames] = useState<any[]>([]);
  const [me, setMe] = useState<any>();
  const [yearId, setYearId] = useState('');
  const [cloneSourceId, setCloneSourceId] = useState('');
  const [newYearStartDate, setNewYearStartDate] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const activeSectionNames = useMemo(() => sectionNames.filter((x: any) => x.active), [sectionNames]);

  async function load(preferred?: string) {
    try {
      const [y, p, names, user] = await Promise.all([
        api('/academic/years'),
        api('/academic/plans'),
        api('/academic/section-names'),
        api('/auth/me'),
      ]);
      setYears(y);
      setPlans(p);
      setSectionNames(names);
      setMe(user);
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
    const f = new FormData(e.currentTarget);
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
      e.currentTarget.reset();
      setNewYearStartDate('');
      await load(y.id);
    } catch (e: any) { setErr(e.message); }
  }

  async function createSectionName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api('/academic/section-names', {
        method: 'POST',
        body: JSON.stringify({ name: String(f.get('name') || '').toLocaleUpperCase('es-VE') }),
      });
      setMsg('Nombre de sección agregado al catálogo administrativo');
      setErr('');
      e.currentTarget.reset();
      setSectionNames(await api('/academic/section-names'));
    } catch (e: any) { setErr(e.message); }
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

  async function createSection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api('/academic/sections', {
        method: 'POST',
        body: JSON.stringify({
          academicYearId: yearId,
          studyPlanId: f.get('studyPlanId'),
          gradeLevel: Number(f.get('gradeLevel')),
          sectionNameId: f.get('sectionNameId'),
          shift: f.get('shift') || undefined,
          capacity: f.get('capacity') ? Number(f.get('capacity')) : undefined,
        }),
      });
      setMsg('Sección creada');
      setErr('');
      e.currentTarget.reset();
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
    <div className="info-banner" style={{marginBottom:16}}><div><strong>CIERRE DE MATRÍCULA AUTOMÁTICO</strong><span>Todos los años escolares cierran el 31 de octubre del año en que comienzan. No requiere activación ni modificación manual.</span></div></div>

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
      <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{sectionNames.length === 0 ? <tr><td colSpan={3}>Todavía no hay nombres de secciones registrados.</td></tr> : sectionNames.map((n:any) => <tr key={n.id}><td><strong>{n.name}</strong></td><td><span className={`status ${n.active?'ok':'neutral'}`}>{n.active?'ACTIVO':'INACTIVO'}</span></td><td><div className="row-actions"><button className="btn secondary mini-btn" type="button" onClick={() => renameSectionName(n)}>Renombrar</button><button className="btn secondary mini-btn" type="button" onClick={() => toggleSectionName(n.id,!n.active)}>{n.active?'Inactivar':'Activar'}</button></div></td></tr>)}</tbody></table></div>
      <p className="muted" style={{marginTop:10}}>Inactivar un nombre impide usarlo en nuevas secciones, pero no modifica las secciones ni matrículas históricas ya creadas.</p>
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
        <div className="form-grid">
          <div className="span-2"><label>Plan *</label><select className="input" name="studyPlanId" required>{plans.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></div>
          <div><label>Grado *</label><select className="input" name="gradeLevel">{[1,2,3,4,5,6].map(g => <option key={g} value={g}>{g}° AÑO</option>)}</select></div>
          <div><label>Nombre de sección *</label><select className="input" name="sectionNameId" required disabled={activeSectionNames.length===0}><option value="">Seleccione</option>{activeSectionNames.map((n:any) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
          <div><label>Turno</label><input className="input uppercase" name="shift" onInput={toUpperInput}/></div>
          <div><label>Capacidad</label><input className="input" name="capacity" type="number" min="1"/></div>
        </div>
        <button className="btn" disabled={activeSectionNames.length===0}>Crear sección</button>
      </form>

      <section className="card"><h3>Secciones configuradas</h3><p className="muted">Antes del 31 de octubre, el número es provisional y se determina por cédula. Desde el 31 de octubre inclusive la numeración queda fija automáticamente; toda matrícula posterior recibe el siguiente número al final.</p><div className="table-wrap"><table><thead><tr><th>Plan</th><th>Grado</th><th>Sección</th><th>Turno</th><th>Matrículas</th><th>Nómina</th></tr></thead><tbody>{sections.length === 0 ? <tr><td colSpan={6}>No hay secciones configuradas.</td></tr> : sections.map(s => <tr key={s.id}><td>{s.studyPlan.code}</td><td>{s.gradeLevel}°</td><td>{s.name}</td><td>{s.shift || '—'}</td><td>{s._count?.enrollments || 0}</td><td>{s.rosterLockedAt ? <span className="status ok">FIJA</span> : closeReached(s) ? <span className="status ok">FIJA AUTOMÁTICA</span> : <span className="status warn">PROVISIONAL HASTA {dateLabel(s.academicYear.enrollmentCloseDate)}</span>}</td></tr>)}</tbody></table></div></section>
    </div>
  </Shell>;
}
