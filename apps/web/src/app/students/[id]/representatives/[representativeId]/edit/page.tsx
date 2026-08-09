'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit3 } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { toUpperInput } from '@/lib/formRules';

function identityLabel(person:any){
  return person?.identityNumber
    ? `${person.nationality==='VENEZOLANO'?'V':'E'}-${person.identityNumber}`
    : (person?.schoolIdentityNumber||'SIN IDENTIFICACIÓN');
}

export default function EditRepresentativeLink(){
  const {id,representativeId}=useParams<{id:string;representativeId:string}>();
  const router=useRouter();
  const [student,setStudent]=useState<any>();
  const [representative,setRepresentative]=useState<any>();
  const [link,setLink]=useState<any>();
  const [relationship,setRelationship]=useState('MADRE');
  const [isPrimary,setIsPrimary]=useState(false);
  const [livesWithStudent,setLivesWithStudent]=useState(false);
  const [authorizationDescription,setAuthorizationDescription]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    Promise.all([api(`/students/${id}`),api(`/representatives/${representativeId}`)])
      .then(([s,r])=>{
        const current=(s.representatives||[]).find((x:any)=>x.representativeId===representativeId);
        if(!current)throw new Error('El representante no está vinculado con este estudiante');
        setStudent(s);setRepresentative(r);setLink(current);
        setRelationship(current.relationship||'MADRE');
        setIsPrimary(!!current.isPrimary);
        setLivesWithStudent(!!current.livesWithStudent);
        setAuthorizationDescription(current.authorizationDescription||'');
      })
      .catch((e:any)=>setError(e.message));
  },[id,representativeId]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const requiresDescription=relationship==='AUTORIZADO'||relationship==='OTRO';
    const description=authorizationDescription.trim().toLocaleUpperCase('es-VE');
    if(requiresDescription&&!description){
      setError(relationship==='OTRO'?'La descripción es obligatoria cuando el parentesco es OTRO':'La descripción de autorización es obligatoria cuando el parentesco es AUTORIZADO');
      return;
    }
    setSaving(true);setError('');
    try{
      await api(`/representatives/${representativeId}/students`,{
        method:'POST',
        body:JSON.stringify({
          studentId:id,
          relationship,
          isPrimary,
          livesWithStudent,
          authorizationDescription:requiresDescription?description:undefined,
        }),
      });
      router.push(`/students/${id}?tab=representantes`);
      router.refresh();
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  }

  async function unlink(){
    if(!student||!representative)return;
    const repName=[representative.firstName,representative.lastName].filter(Boolean).join(' ');
    const studentName=[student.firstName,student.lastName].filter(Boolean).join(' ');
    if(!confirm(`¿Desvincular a ${repName} de ${studentName}? Esta acción elimina únicamente la relación entre ambos.`))return;
    setSaving(true);setError('');
    try{
      await api(`/representatives/${representativeId}/students/${id}/remove`,{method:'POST'});
      router.push(`/students/${id}?tab=representantes`);
      router.refresh();
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  }

  if(error&&!student)return <Shell title="Modificar vínculo"><div className="alert">{error}</div><Link className="btn secondary" href={`/students/${id}?tab=representantes`}><ArrowLeft size={16}/> Volver</Link></Shell>;
  if(!student||!representative||!link)return <Shell title="Modificar vínculo"><div className="card">Cargando vínculo…</div></Shell>;

  const requiresDescription=relationship==='AUTORIZADO'||relationship==='OTRO';
  return <Shell title="Modificar vínculo">
    <div className="page-heading">
      <div><span className="eyebrow">Relación estudiante · representante</span><h1>Modificar vínculo</h1><p>Corrija el parentesco, representante principal, convivencia o descripción sin crear nuevamente a ninguna persona.</p></div>
      <Link className="btn secondary" href={`/students/${id}?tab=representantes`}><ArrowLeft size={16}/> Volver</Link>
    </div>
    {error&&<div className="alert">{error}</div>}

    <div className="details-grid">
      <section className="card"><h3>Estudiante</h3><p><strong>{[student.firstName,student.middleName,student.lastName,student.secondLastName].filter(Boolean).join(' ')}</strong></p><p className="muted">{identityLabel(student)}</p></section>
      <section className="card"><h3>Representante</h3><p><strong>{[representative.firstName,representative.middleName,representative.lastName,representative.secondLastName].filter(Boolean).join(' ')}</strong></p><p className="muted">{identityLabel(representative)} · {representative.phone1}</p></section>
    </div>

    <form className="card form-section" onSubmit={submit} style={{marginTop:16}}>
      <div className="section-head"><div><h2>Datos del vínculo</h2><p>Estos datos pertenecen a la relación entre este estudiante y este representante.</p></div><Edit3 size={22}/></div>
      <div className="form-grid cols-3">
        <div><label>Parentesco *</label><select className="input" value={relationship} onChange={e=>{const value=e.target.value;setRelationship(value);if(value!=='AUTORIZADO'&&value!=='OTRO')setAuthorizationDescription('')}} required><option value="MADRE">MADRE</option><option value="PADRE">PADRE</option><option value="AUTORIZADO">AUTORIZADO</option><option value="OTRO">OTRO</option></select></div>
        <div className="span-2"><label>Descripción de autorización {requiresDescription?'*':''}</label><input className="input uppercase" value={authorizationDescription} onChange={e=>setAuthorizationDescription(e.target.value.toLocaleUpperCase('es-VE'))} onInput={toUpperInput} placeholder={relationship==='AUTORIZADO'?'DESCRIPCIÓN DE AUTORIZACIÓN':relationship==='OTRO'?'DESCRIBA LA RELACIÓN CON EL ESTUDIANTE':'NO APLICA'} required={requiresDescription} disabled={!requiresDescription}/>{relationship==='AUTORIZADO'&&<small className="muted">Este campo es obligatorio para AUTORIZADO.</small>}{relationship==='OTRO'&&<small className="muted">Indique específicamente la relación con el estudiante.</small>}</div>
        <label className="check-card"><input type="checkbox" checked={isPrimary} onChange={e=>setIsPrimary(e.target.checked)}/><span><strong>Representante principal</strong><small>Será el contacto principal del estudiante.</small></span></label>
        <label className="check-card"><input type="checkbox" checked={livesWithStudent} onChange={e=>setLivesWithStudent(e.target.checked)}/><span><strong>Vive con el estudiante</strong><small>Actualiza únicamente este vínculo.</small></span></label>
      </div>
      <div className="action-bar"><button className="btn secondary" type="button" onClick={unlink} disabled={saving}>Desvincular</button><button className="btn" type="submit" disabled={saving}><Edit3 size={16}/>{saving?'Guardando…':'Guardar cambios del vínculo'}</button></div>
    </form>
  </Shell>;
}
