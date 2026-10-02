'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Link2, RefreshCw, Search, UserRoundPlus, UsersRound } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { toUpperInput } from '@/lib/formRules';

function identityLabel(person:any){
  return person?.identityNumber
    ? `${person.nationality==='VENEZOLANO'?'V':'E'}-${person.identityNumber}`
    : (person?.schoolIdentityNumber||'SIN IDENTIFICACIÓN');
}

export default function LinkRepresentativeToStudent(){
  const {id}=useParams<{id:string}>();
  const router=useRouter();
  const [student,setStudent]=useState<any>();
  const [representatives,setRepresentatives]=useState<any[]>([]);
  const [selected,setSelected]=useState('');
  const [q,setQ]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [relationship,setRelationship]=useState('MADRE');

  async function loadData(){
    try{
      const [s,reps]:any[]=await Promise.all([api(`/students/${id}`),api('/representatives?active=true')]);
      setStudent(s);setRepresentatives(reps);setError('');
    }catch(e:any){setError(e.message)}
  }

  useEffect(()=>{
    loadData();
    const refresh=()=>loadData();
    window.addEventListener('focus',refresh);
    return()=>window.removeEventListener('focus',refresh);
  },[id]);

  const available=useMemo(()=>{
    if(!student)return [];
    const linked=new Set((student.representatives||[]).map((x:any)=>x.representativeId));
    const term=q.trim().toLocaleUpperCase('es-VE');
    return representatives.filter((r:any)=>{
      if(linked.has(r.id))return false;
      if(!term)return true;
      const haystack=[r.firstName,r.middleName,r.lastName,r.secondLastName,r.identityNumber,r.phone1]
        .filter(Boolean).join(' ').toLocaleUpperCase('es-VE');
      return haystack.includes(term.replace(/^[VE]-?/,'').trim())||haystack.includes(term);
    });
  },[representatives,student,q]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!selected){setError('Seleccione un representante para vincular');return;}
    const f=new FormData(e.currentTarget);
    const authorizationDescription=String(f.get('authorizationDescription')||'').trim().toLocaleUpperCase('es-VE');
    const requiresDescription=relationship==='AUTORIZADO'||relationship==='OTRO';
    if(requiresDescription&&!authorizationDescription){setError(relationship==='OTRO'?'La descripción es obligatoria cuando el parentesco es OTRO':'La descripción de autorización es obligatoria cuando el parentesco es AUTORIZADO');return;}
    setSaving(true);setError('');
    try{
      await api(`/representatives/${selected}/students`,{
        method:'POST',
        body:JSON.stringify({
          studentId:id,
          relationship,
          isPrimary:f.get('isPrimary')==='on',
          livesWithStudent:f.get('livesWithStudent')==='on',
          authorizationDescription:requiresDescription?authorizationDescription:undefined,
        }),
      });
      router.push(`/students/${id}?tab=representantes`);
      router.refresh();
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  }

  if(!student)return <Shell title="Vincular representante"><div className="card">Cargando estudiante y representantes…</div></Shell>;

  return <Shell title="Vincular representante">
    <div className="page-heading">
      <div><span className="eyebrow">Relación estudiante · representante</span><h1>Vincular representante existente</h1><p>Selecciona una persona ya registrada. El mismo representante puede vincularse posteriormente con otros estudiantes.</p></div>
      <div className="row-actions"><Link className="btn secondary" href={`/students/${id}?tab=representantes`}><ArrowLeft size={16}/> Volver</Link><Link className="btn" href={`/representatives/new?studentId=${id}`}><UserRoundPlus size={16}/> Crear representante</Link></div>
    </div>

    {error&&<div className="alert">{error}</div>}

    <div className="card" style={{marginBottom:16}}>
      <div className="person-title"><strong>{[student.firstName,student.middleName,student.lastName,student.secondLastName].filter(Boolean).join(' ')}</strong><span className="status ok">{identityLabel(student)}</span></div>
      <p className="muted">Representantes ya vinculados: {student.representatives?.length||0}</p>
    </div>

    <form onSubmit={submit} className="stack">
      <section className="card form-section">
        <div className="section-head"><div><h2>1. Buscar y seleccionar representante</h2><p>Busca por nombre, apellido, cédula o teléfono.</p></div></div>
        <div className="row-actions" style={{marginBottom:14}}><div className="search-box" style={{flex:1}}><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ej.: V-12345678, MARÍA PÉREZ o 0412..."/></div><button type="button" className="btn secondary" onClick={loadData}><RefreshCw size={16}/> Actualizar lista</button></div>
        {available.length===0?<div className="empty-state"><UsersRound size={28}/><strong>No hay representantes disponibles</strong><span>Puede que todos estén vinculados o que todavía no exista el representante.</span><Link className="btn" href={`/representatives/new?studentId=${id}`}><UserRoundPlus size={16}/> Crear representante</Link></div>:
        <div className="table-wrap"><table><thead><tr><th></th><th>Cédula</th><th>Representante</th><th>Teléfono</th><th>Estudiantes asociados</th></tr></thead><tbody>{available.map((r:any)=><tr key={r.id} onClick={()=>setSelected(r.id)} style={{cursor:'pointer'}}><td><input type="radio" name="representativeChoice" checked={selected===r.id} onChange={()=>setSelected(r.id)}/></td><td><strong>{identityLabel(r)}</strong></td><td>{[r.firstName,r.middleName,r.lastName,r.secondLastName].filter(Boolean).join(' ')}</td><td>{r.phone1}</td><td>{r.students?.length||0}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="card form-section">
        <div className="section-head"><div><h2>2. Definir relación con el estudiante</h2><p>Esta información pertenece al vínculo, no al representante; puede ser distinta para cada estudiante.</p></div></div>
        <div className="form-grid cols-3">
          <div><label>Parentesco *</label><select className="input" name="relationship" value={relationship} onChange={e=>setRelationship(e.target.value)} required><option value="MADRE">MADRE</option><option value="PADRE">PADRE</option><option value="AUTORIZADO">AUTORIZADO</option><option value="OTRO">OTRO</option></select></div>
          <div className="span-2"><label>Descripción de autorización {(relationship==='AUTORIZADO'||relationship==='OTRO')?'*':''}</label><input className="input uppercase" name="authorizationDescription" onInput={toUpperInput} placeholder={relationship==='AUTORIZADO'?'INDIQUE QUIÉN AUTORIZA O EL FUNDAMENTO DE LA AUTORIZACIÓN':relationship==='OTRO'?'DESCRIBA LA RELACIÓN CON EL ESTUDIANTE':'NO APLICA'} required={relationship==='AUTORIZADO'||relationship==='OTRO'} disabled={relationship!=='AUTORIZADO'&&relationship!=='OTRO'}/>{relationship==='AUTORIZADO'&&<small className="muted">Debe indicar quién autoriza o el fundamento de la autorización. Sin esta descripción no se permite guardar el vínculo.</small>}{relationship==='OTRO'&&<small className="muted">Debe describir de forma específica la relación de esta persona con el estudiante.</small>}</div>
          <label className="check-card"><input type="checkbox" name="isPrimary" defaultChecked={(student.representatives?.length||0)===0}/><span><strong>Representante principal</strong><small>Será el contacto principal de este estudiante.</small></span></label>
          <label className="check-card"><input type="checkbox" name="livesWithStudent"/><span><strong>Vive con el estudiante</strong><small>Se almacena individualmente para esta relación.</small></span></label>
        </div>
      </section>

      <div className="action-bar"><Link className="btn secondary" href={`/students/${id}?tab=representantes`}>Cancelar</Link><button className="btn" type="submit" disabled={!selected||saving}><Link2 size={16}/>{saving?'Vinculando…':'Vincular representante'}</button></div>
    </form>
  </Shell>;
}
