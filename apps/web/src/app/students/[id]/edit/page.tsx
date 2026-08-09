'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import StudentForm from '@/components/StudentForm';
import { api } from '@/lib/api';

export default function EditStudent(){
  const {id}=useParams<{id:string}>();
  const [student,setStudent]=useState<any>();
  const [error,setError]=useState('');
  useEffect(()=>{api(`/students/${id}`).then(setStudent).catch((e)=>setError(e.message))},[id]);
  if(error) return <Shell title="Editar estudiante"><div className="alert">{error}</div></Shell>;
  if(!student) return <Shell title="Editar estudiante"><div className="card">Cargando ficha…</div></Shell>;
  return <Shell title={`Editar · ${student.firstName} ${student.lastName}`}><StudentForm mode="edit" student={student}/></Shell>;
}
