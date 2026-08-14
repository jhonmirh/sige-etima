'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {BriefcaseBusiness,GraduationCap,Hammer,Plus,Search,UsersRound} from 'lucide-react';
import Shell from '@/components/Shell';
import {api} from '@/lib/api';

const TYPE_LABELS:Record<string,string>={DOCENTE:'DOCENTE',ADMINISTRATIVO:'ADMINISTRATIVO',OBRERO:'OBRERO',COCINERO:'COCINERA(O)'};
const CONDITION_LABELS:Record<string,string>={ACTIVO:'ACTIVO',REPOSO_CONTINUO:'REPOSO CONTINUO',INCAPACITADO:'INCAPACITADO',JUBILADO:'JUBILADO',EN_PROCESO_JUBILACION:'EN PROCESO DE JUBILACIÓN',PROCESO_ADMINISTRATIVO:'PROCESO ADMINISTRATIVO'};
function identity(s:any){return `${s.nationality==='VENEZOLANO'?'V':'E'}-${s.identityNumber}`}
function serviceYears(value?:string){if(!value)return null;const start=new Date(value);if(Number.isNaN(start.getTime()))return null;const now=new Date();let years=now.getFullYear()-start.getFullYear();const anniversary=new Date(now.getFullYear(),start.getMonth(),start.getDate());if(now<anniversary)years--;return Math.max(0,years)}

export default function StaffPage(){
  const [rows,setRows]=useState<any[]>([]); const [search,setSearch]=useState(''); const [type,setType]=useState(''); const [active,setActive]=useState('true'); const [error,setError]=useState('');
  async function load(){try{const qs=new URLSearchParams();if(search.trim())qs.set('search',search.trim());if(type)qs.set('type',type);if(active!=='all')qs.set('active',active);setRows(await api(`/staff?${qs.toString()}`));setError('')}catch(e:any){setError(e.message)}}
  useEffect(()=>{const t=setTimeout(load,180);return()=>clearTimeout(t)},[search,type,active]);
  const metrics=useMemo(()=>({total:rows.length,docentes:rows.filter(x=>x.staffType==='DOCENTE').length,administrativos:rows.filter(x=>x.staffType==='ADMINISTRATIVO').length,obreros:rows.filter(x=>x.staffType==='OBRERO').length,cocineros:rows.filter(x=>x.staffType==='COCINERO').length}),[rows]);
  return <Shell title="Personal">
    <div className="page-heading"><div><div className="eyebrow">GESTIÓN DE PERSONAL</div><h1>Personal de la institución</h1><p>Docentes, administrativos, obreros y cocineras(os): datos laborales, condición, títulos profesionales, información bancaria y asignaciones académicas.</p></div><Link className="btn" href="/staff/new"><Plus size={17}/> Nuevo personal</Link></div>
    {error&&<div className="alert">{error}</div>}
    <div className="grid compact-grid metrics-5">
      <div className="card metric-card"><UsersRound/><div><span className="muted">Resultados</span><strong>{metrics.total}</strong></div></div>
      <div className="card metric-card"><GraduationCap/><div><span className="muted">Docentes</span><strong>{metrics.docentes}</strong></div></div>
      <div className="card metric-card"><BriefcaseBusiness/><div><span className="muted">Administrativos</span><strong>{metrics.administrativos}</strong></div></div>
      <div className="card metric-card"><Hammer/><div><span className="muted">Obreros</span><strong>{metrics.obreros}</strong></div></div>
      <div className="card metric-card"><BriefcaseBusiness/><div><span className="muted">Cocineras(os)</span><strong>{metrics.cocineros}</strong></div></div>
    </div>
    <div className="card toolbar-card"><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, apellido, cédula, cargo o función"/></div><select className="input filter-select" value={type} onChange={e=>setType(e.target.value)}><option value="">TODOS LOS TIPOS</option><option value="DOCENTE">DOCENTES</option><option value="ADMINISTRATIVO">ADMINISTRATIVOS</option><option value="OBRERO">OBREROS</option><option value="COCINERO">COCINERAS(OS)</option></select><select className="input filter-select" value={active} onChange={e=>setActive(e.target.value)}><option value="true">REGISTROS ACTIVOS</option><option value="false">REGISTROS INACTIVOS</option><option value="all">TODOS</option></select></div>
    <div className="table-wrap"><table><thead><tr><th>Identificación</th><th>Personal</th><th>Tipo</th><th>Cargo / función</th><th>Condición laboral</th><th>Ingreso MPPE</th><th>Servicio</th><th>Títulos</th><th>Registro</th></tr></thead><tbody>{rows.length===0?<tr><td colSpan={9}><div className="empty-state"><strong>Sin resultados</strong><span>No hay personal que coincida con los filtros.</span></div></td></tr>:rows.map(s=><tr key={s.id}><td><strong>{identity(s)}</strong></td><td><Link className="table-link" href={`/staff/${s.id}`}>{s.lastName} {s.secondLastName||''}, {s.firstName} {s.middleName||''}</Link><br/><small>{s.phone||'Sin teléfono'} · {s.email||'Sin correo'}</small></td><td>{TYPE_LABELS[s.staffType]||s.staffType}</td><td>{s.cargoCode?`${s.cargoCode} · `:''}{s.cargoDescription||'—'}<br/><small>{s.institutionalFunction||'Función no indicada'}</small></td><td><span className={`status ${s.employmentCondition==='ACTIVO'?'ok':'neutral'}`}>{CONDITION_LABELS[s.employmentCondition]||s.employmentCondition||'ACTIVO'}</span></td><td>{s.ministryEntryDate?new Date(s.ministryEntryDate).toLocaleDateString('es-VE'):'—'}</td><td>{serviceYears(s.ministryEntryDate)===null?'—':`${serviceYears(s.ministryEntryDate)} años`}</td><td>{s.qualifications?.length||0}</td><td><span className={`status ${s.active?'ok':'neutral'}`}>{s.active?'ACTIVO':'INACTIVO'}</span></td></tr>)}</tbody></table></div>
  </Shell>
}
