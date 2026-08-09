'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {BookOpenCheck,CalendarRange,ClipboardList,RefreshCcw,Search,Settings2,UserPlus,UsersRound} from 'lucide-react';
import Shell from '@/components/Shell';
import {api} from '@/lib/api';
import {dateLabel,schoolDateKey,storedDateKey} from '@/lib/schoolCalendar';

function pretty(v?:string){return v?v.replaceAll('_',' '):'—'}
function idLabel(s:any){return s?.identityNumber?`${s.nationality==='VENEZOLANO'?'V':'E'}-${s.identityNumber}`:(s?.schoolIdentityNumber||'SIN CÉDULA')}

export default function Enrollments(){
  const [years,setYears]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[yearId,setYearId]=useState(''),[condition,setCondition]=useState(''),[q,setQ]=useState(''),[loading,setLoading]=useState(true),[err,setErr]=useState('');
  useEffect(()=>{api('/academic/years').then((y:any[])=>{setYears(y);const active=y.find(x=>x.active)||y[0];if(active)setYearId(active.id)}).catch((e:any)=>setErr(e.message))},[]);
  useEffect(()=>{if(!yearId)return;const t=setTimeout(async()=>{setLoading(true);try{const p=new URLSearchParams({academicYearId:yearId});if(condition)p.set('condition',condition);if(q.trim())p.set('search',q.trim());setRows(await api(`/enrollments?${p}`));setErr('')}catch(e:any){setErr(e.message)}finally{setLoading(false)}},220);return()=>clearTimeout(t)},[yearId,condition,q]);
  const stats=useMemo(()=>({total:rows.length,regular:rows.filter(x=>x.condition==='REGULAR').length,pending:rows.filter(x=>x.condition==='MATERIA_PENDIENTE').length,repeat:rows.filter(x=>x.condition==='REPITIENTE').length}),[rows]);
  const year=years.find(x=>x.id===yearId);
  const closeReached=!!year?.enrollmentCloseDate && schoolDateKey()>=storedDateKey(year.enrollmentCloseDate);
  const fixedCount=rows.filter((x:any)=>x.rosterStatus==='FIJA').length;
  return <Shell title="Matrícula / Reinscripción">
    <div className="page-heading"><div><span className="eyebrow">Gestión académica anual</span><h1>Matrícula y reinscripción</h1><p>Una ficha permanente por estudiante y una matrícula histórica por cada año escolar. La condición académica de reinscripción proviene de la definitiva de Notas.</p></div><div className="row-actions"><Link className="btn secondary" href="/enrollments/configuration"><Settings2 size={17}/> Configuración anual</Link><Link className="btn secondary" href="/enrollments/new"><UserPlus size={17}/> Primera matrícula</Link><Link className="btn" href="/enrollments/reenroll"><RefreshCcw size={17}/> Reinscribir</Link></div></div>
    {err&&<div className="alert">{err}</div>}
    <div className="grid metrics-4 compact-grid">
      <div className="card metric-card"><UsersRound size={20}/><div><span className="muted">Inscritos visibles</span><strong>{stats.total}</strong></div></div>
      <div className="card metric-card"><BookOpenCheck size={20}/><div><span className="muted">Regulares</span><strong>{stats.regular}</strong></div></div>
      <div className="card metric-card"><ClipboardList size={20}/><div><span className="muted">Materia pendiente</span><strong>{stats.pending}</strong></div></div>
      <div className="card metric-card"><CalendarRange size={20}/><div><span className="muted">Repitientes</span><strong>{stats.repeat}</strong></div></div>
    </div>
    <div className="card toolbar-card enrollment-toolbar">
      <div><label>Año escolar</label><select className="input" value={yearId} onChange={e=>setYearId(e.target.value)}>{years.map(y=><option key={y.id} value={y.id}>{y.name}{y.active?' · ACTIVO':''}</option>)}</select></div>
      <div><label>Condición</label><select className="input" value={condition} onChange={e=>setCondition(e.target.value)}><option value="">Todas</option><option>REGULAR</option><option>MATERIA_PENDIENTE</option><option>REPITIENTE</option><option>RETIRADO</option><option>RETIRADO_MODIFICADO</option><option>GRADUADO</option><option>INACTIVO</option></select></div>
      <div className="search-box enrollment-search"><Search size={18}/><input placeholder="Buscar por estudiante o cédula" value={q} onChange={e=>setQ(e.target.value)}/></div>
    </div>
    {year&&<>
      <div className="info-banner enrollment-year-banner"><div><strong>{year.name}</strong><span>Inicio {dateLabel(year.startDate)} · Cierre automático de matrícula {dateLabel(year.enrollmentCloseDate)} · {year.active?'AÑO ACTIVO':'AÑO HISTÓRICO'}</span></div></div>
      {year.enrollmentCloseDate&&<div className={closeReached?'success-banner':'warning-banner'} style={{marginTop:12}}><div><strong>{closeReached?'NÓMINA FIJA AUTOMÁTICAMENTE':'NÓMINA PROVISIONAL · CIERRE AUTOMÁTICO'}</strong><span>{closeReached?`Desde el ${dateLabel(year.enrollmentCloseDate)} los números ocupados no cambian. Toda inscripción o reinscripción posterior recibe el siguiente número disponible al final de su nómina.`:`Hasta antes del ${dateLabel(year.enrollmentCloseDate)} la nómina se ordena por número de cédula dentro de cada año/grado, plan o mención y sección. Los números son provisionales. A partir del ${dateLabel(year.enrollmentCloseDate)} quedan fijos y los nuevos estudiantes se agregan al final.`}{fixedCount>0?` · ${fixedCount} registro(s) visibles con numeración fija.`:''}</span></div></div>}
    </>}
    <div className="table-wrap"><table><thead><tr><th>N°</th><th>Identificación</th><th>Estudiante</th><th>Plan</th><th>Grado / Sección</th><th>Condición</th><th>Materias</th><th>Inscripción</th></tr></thead><tbody>{loading?<tr><td colSpan={8}>Cargando…</td></tr>:rows.length===0?<tr><td colSpan={8}>No hay matrículas con los filtros seleccionados.</td></tr>:rows.map(e=><tr key={e.id}><td><strong>{e.displayListNumber??e.listNumber??'—'}</strong>{e.rosterStatus==='PROVISIONAL'&&<small className="muted" style={{display:'block'}}>PROV.</small>}</td><td>{idLabel(e.student)}</td><td><Link className="table-link" href={`/enrollments/${e.id}`}>{e.student.lastName} {e.student.secondLastName||''}, {e.student.firstName} {e.student.middleName||''}</Link></td><td>{e.studyPlan.code}</td><td>{e.gradeLevel}° · {e.section.name}</td><td><span className={`status ${e.condition==='REGULAR'?'ok':e.condition==='MATERIA_PENDIENTE'?'warn':'neutral'}`}>{pretty(e.condition)}</span></td><td>{e.curriculumSubjects?.length||0}</td><td>{new Date(e.registrationDate).toLocaleDateString('es-VE')}{e.isLateEnrollment?' · POST-CIERRE':''}</td></tr>)}</tbody></table></div>
  </Shell>
}
