'use client';
import {useEffect,useState} from 'react';import {useParams} from 'next/navigation';import Shell from '@/components/Shell';import RepresentativeForm from '@/components/RepresentativeForm';import {api} from '@/lib/api';
export default function EditRepresentative(){const {id}=useParams<{id:string}>();const [r,setR]=useState<any>();useEffect(()=>{api(`/representatives/${id}`).then(setR)},[id]);return <Shell title="Editar representante">{r?<RepresentativeForm mode="edit" representative={r}/>:<div className="card">Cargando…</div>}</Shell>}
