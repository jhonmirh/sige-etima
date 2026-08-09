'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Link2, Search, UsersRound } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { toUpperInput } from '@/lib/formRules';

function identityLabel(person:any){
  return person?.identityNumber
    ? `${person.nationality==='VENEZOLANO'?'V':'E'}-${person.identityNumber}`
    : (person?.schoolIdentityNumber||'SIN IDENTIFICACIÓN');
}

export default function LinkStudentToRepresentative(){
  const {id}=useParams<{id:string}>();
  const router=useRouter();
  const [representative,setRepresentative]=useState<any>();
  const [students,setStudents]=useState<any[]>([]);
  const [selected,setSelected]=useState('');
  const [q,setQ]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [relationship,setRelationship]=useState('MADRE');

  useEffect(()=>{
    Promise.all([api(`/representatives/${id}`),api('/students?active=true')])
      .then(([r,s])=>{setRepresentative(r);setStudents(s)})
      .catch((e:any)=>setError(e.message));
  },[id]);

  const available=useMemo(()=>{
    if(!representative)return [];
    const linked=new Set((representative.students||[]).map((x:any)=>x.studentId));
    const term=q.trim().toLocaleUpperCase('es-VE');
    return students.filter((s:any)=>{
      if(linked.has(s.id))return false;
      if(!term)return true;
      const haystack=[s.firstName,s.middleName,s.lastName,s.secondLastName,s.identityNumber,s.schoolIdentityNumber]
        .filter(Boolean).join(' ').toLocaleUpperCase('es-VE');
      return haystack.includes(term.replace(/^[VE]-?/,'').trim())||haystack.includes(term);
    });
  },[students,representative,q]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!selected){setError('Seleccione un estudiante para vincular');return;}
    const f=new FormData(e.currentTarget);
    const authorizationDescription=String(f.get('authorizationDescription')||'').trim().toLocaleUpperCase('es-VE');
    const requiresDescription=relationship==='AUTORIZADO'||relationship==='OTRO';
    if(requiresDescription&&!authorizationDescription){setError(relationship==='OTRO'?'La descripción es obligatoria cuando el parentesco es OTRO':'La descripción de autorización es obligatoria cuando el parentesco es AUTORIZADO');return;}
    setSaving(true);setError('');
    try{
      await api(`/representatives/${id}/students`,{
        method:'POST',
        body:JSON.stringify({
          studentId:selected,
          relationship,
          isPrimary:f.get('isPrimary')==='on',
          livesWithStudent:f.get('livesWithStudent')==='on',
          authorizationDescription:requiresDescription?authorizationDescription:undefined,
        }),
      });
      router.push(`/representatives/${id}`);
      router.refresh();
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  }

  if(!representative)return <Shell title="Vincular estudiante"><div className="card">Cargando representante y estudiantes…</div></Shell>;

  return <Shell title="Vincular estudiante">
    <div className="page-heading">
      <div><span className="eyebrow">Representante · estudiantes</span><h1>Vincular otro estudiante</h1><p>Este representante puede quedar asociado a varios estudiantes. Cada vínculo conserva su propio parentesco y condición de representante principal.</p></div>
      <Link className="btn secondary" href={`/representatives/${id}`}><ArrowLeft size={16}/> Volver al representante</Link>
    </div>

    {error&&<div className="alert">{error}</div>}

    <div className="card" style={{marginBottom:16}}><div className="person-title"><strong>{[representative.firstName,representative.middleName,representative.lastName,representative.secondLastName].filter(Boolean).join(' ')}</strong><span className="status ok">{identityLabel(representative)}</span></div><p className="muted">Estudiantes actualmente vinculados: {representative.students?.length||0}</p></div>

    <form onSubmit={submit} className="stack">
      <section className="card form-section">
        <div className="section-head"><div><h2>1. Buscar estudiante</h2><p>Busca por nombre, apellido, cédula o cédula escolar.</p></div></div>
        <div className="search-box" style={{marginBottom:14}}><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar estudiante"/></div>
        {available.length===0?<div className="empty-state"><UsersRound size={28}/><strong>No hay estudiantes disponibles</strong><span>Todos los estudiantes visibles ya pueden estar vinculados con este representante.</span></div>:
        <div className="table-wrap"><table><thead><tr><th></th><th>Identificación</th><th>Estudiante</th><th>Representante actual</th></tr></thead><tbody>{available.map((s:any)=>{const primary=s.representatives?.find((x:any)=>x.isPrimary)?.representative;return <tr key={s.id} onClick={()=>setSelected(s.id)} style={{cursor:'pointer'}}><td><input type="radio" name="studentChoice" checked={selected===s.id} onChange={()=>setSelected(s.id)}/></td><td><strong>{identityLabel(s)}</strong></td><td>{[s.firstName,s.middleName,s.lastName,s.secondLastName].filter(Boolean).join(' ')}</td><td>{primary?`${primary.firstName} ${primary.lastName}`:'SIN PRINCIPAL'}</td></tr>})}</tbody></table></div>}
      </section>

      <section className="card form-section">
        <div className="section-head"><div><h2>2. Definir relación</h2><p>El parentesco se guarda específicamente para el estudiante seleccionado.</p></div></div>
        <div className="form-grid cols-3">
          <div><label>Parentesco *</label><select className="input" name="relationship" value={relationship} onChange={e=>setRelationship(e.target.value)} required><option value="MADRE">MADRE</option><option value="PADRE">PADRE</option><option value="AUTORIZADO">AUTORIZADO</option><option value="OTRO">OTRO</option></select></div>
          <div className="span-2"><label>Descripción de autorización {(relationship==='AUTORIZADO'||relationship==='OTRO')?'*':''}</label><input className="input uppercase" name="authorizationDescription" onInput={toUpperInput} placeholder={relationship==='AUTORIZADO'?'INDIQUE QUIÉN AUTORIZA O EL FUNDAMENTO DE LA AUTORIZACIÓN':relationship==='OTRO'?'DESCRIBA LA RELACIÓN CON EL ESTUDIANTE':'NO APLICA'} required={relationship==='AUTORIZADO'||relationship==='OTRO'} disabled={relationship!=='AUTORIZADO'&&relationship!=='OTRO'}/>{relationship==='AUTORIZADO'&&<small className="muted">Debe indicar quién autoriza o el fundamento de la autorización. Sin esta descripción no se permite guardar el vínculo.</small>}{relationship==='OTRO'&&<small className="muted">Debe describir de forma específica la relación de esta persona con el estudiante.</small>}</div>
          <label className="check-card"><input type="checkbox" name="isPrimary"/><span><strong>Representante principal</strong><small>Si se marca, sustituirá al principal actual de ese estudiante.</small></span></label>
          <label className="check-card"><input type="checkbox" name="livesWithStudent"/><span><strong>Vive con el estudiante</strong><small>Dato individual de esta relación.</small></span></label>
        </div>
      </section>

      <div className="action-bar"><Link className="btn secondary" href={`/representatives/${id}`}>Cancelar</Link><button className="btn" type="submit" disabled={!selected||saving}><Link2 size={16}/>{saving?'Vinculando…':'Vincular estudiante'}</button></div>
    </form>
  </Shell>;
}
