'use client';
import Shell from '@/components/Shell';
import StudentForm from '@/components/StudentForm';

export default function NewStudent(){
  return <Shell title="Nuevo estudiante"><StudentForm mode="create" /></Shell>;
}
