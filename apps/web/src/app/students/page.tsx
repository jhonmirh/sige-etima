'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, UserPlus, Users, UserCheck, UserX, UserRoundPlus, Link2 } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';

function age(birthDate:string){
  const b=new Date(birthDate); const n=new Date(); let a=n.getFullYear()-b.getFullYear();
  const m=n.getMonth()-b.getMonth(); if(m<0||(m===0&&n.getDate()<b.getDate())) a--; return a;
}

function identityLabel(row:any){
  if(row.identityNumber) return `${row.nationality==='VENEZOLANO'?'V':'E'}-${row.identityNumber}`;
  return row.schoolIdentityNumber || 'SIN CÉDULA';
}

function statusLabel(row:any){
  const value=row.displayStatus||'ACTIVO';
  if(value==='RETIRADO_MODIFICADO') return 'RETIRADO';
  return value.replaceAll('_',' ');
}

function statusClass(row:any){
  const value=row.displayStatus;
  if(['REGULAR','MATERIA_PENDIENTE','REPITIENTE','ACTIVO'].includes(value)) return 'ok';
  if(['RETIRADO','RETIRADO_MODIFICADO'].includes(value)) return 'warn';
  return 'neutral';
}

export default function Students(){
  const [rows,setRows]=useState<any[]>([]);
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('active');
  const [loading,setLoading]=useState(true);

  async function load(search=q,nextStatus=status){
    setLoading(true);
    const params=new URLSearchParams();
    if(search.trim()) params.set('search',search.trim());
    if(nextStatus!=='all') params.set('active',String(nextStatus==='active'));
    try{setRows(await api(`/students${params.toString()?`?${params}`:''}`))}finally{setLoading(false)}
  }

  useEffect(()=>{const t=setTimeout(()=>load(q,status),250);const onFocus=()=>load(q,status);window.addEventListener('focus',onFocus);return()=>{clearTimeout(t);window.removeEventListener('focus',onFocus)}},[q,status]);
  const activeCount=useMemo(()=>rows.filter(x=>x.academicallyActive).length,[rows]);

  return <Shell title="Estudiantes">
    <div className="page-heading"><div><span className="eyebrow">Gestión estudiantil</span><h1>Ficha integral del estudiante</h1><p>Identificación, familia, salud, representantes, documentos y trayectoria escolar.</p></div><Link className="btn" href="/students/new"><UserPlus size={17}/> Nuevo estudiante</Link></div>
    <div className="grid metrics-3 compact-grid">
      <div className="card metric-card"><Users size={20}/><div><span className="muted">Resultados</span><strong>{rows.length}</strong></div></div>
      <div className="card metric-card"><UserCheck size={20}/><div><span className="muted">Activos visibles</span><strong>{activeCount}</strong></div></div>
      <div className="card metric-card"><UserX size={20}/><div><span className="muted">Inactivos visibles</span><strong>{rows.length-activeCount}</strong></div></div>
    </div>
    <div className="card toolbar-card">
      <div className="search-box"><Search size={18}/><input placeholder="Buscar por nombre, apellido, cédula o cédula escolar" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <select className="input filter-select" value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option></select>
    </div>
    <div className="table-wrap">
      <table><thead><tr><th>Identificación</th><th>Estudiante</th><th>Sexo</th><th>Edad</th><th>Representante</th><th>Última matrícula</th><th>Estado</th></tr></thead>
      <tbody>{loading?<tr><td colSpan={7}>Cargando…</td></tr>:rows.length===0?<tr><td colSpan={7}><div className="empty-state"><Users size={28}/><strong>No se encontraron estudiantes</strong><span>Prueba con otro criterio de búsqueda.</span></div></td></tr>:rows.map(r=>{
        const primary=r.representatives?.find((x:any)=>x.isPrimary)?.representative;
        const anyRep=r.representatives?.[0]?.representative;
        const rep=primary||anyRep;
        const e=r.enrollments?.[0];
        return <tr key={r.id}>
          <td><strong>{identityLabel(r)}</strong><div className="muted">NACIONALIDAD {r.nationality==='VENEZOLANO'?'V':'E'}</div></td>
          <td><Link className="table-link" href={`/students/${r.id}`}>{[r.lastName,r.secondLastName,r.firstName,r.middleName].filter(Boolean).join(' ')}</Link><div className="muted">{r.email||r.phone||'SIN CONTACTO'}</div></td>
          <td>{r.sex}</td><td>{age(r.birthDate)} AÑOS</td>
          <td>{rep?<div className="rep-cell"><strong>{rep.firstName} {rep.lastName}</strong><span className="muted">{primary?'PRINCIPAL':'VINCULADO'}</span><Link className="inline-action" href={`/students/${r.id}/representatives/link`}><Link2 size={14}/> Gestionar</Link></div>:<div className="rep-cell missing"><span className="status warn">SIN REPRESENTANTE</span><div className="row-actions"><Link className="inline-action" href={`/students/${r.id}/representatives/link`}><Link2 size={14}/> Asignar existente</Link><Link className="inline-action" href={`/representatives/new?studentId=${r.id}`}><UserRoundPlus size={14}/> Crear nuevo</Link></div></div>}</td>
          <td>{e?<><strong>{e.academicYear?.name}</strong><div className="muted">{e.gradeLevel}° · {e.section?.mentionName?`${e.section.mentionName} · `:''}{e.section?.name}</div></>:'SIN MATRÍCULA'}</td>
          <td><span className={`status ${statusClass(r)}`}>{statusLabel(r)}</span></td>
        </tr>
      })}</tbody></table>
    </div>
  </Shell>
}
