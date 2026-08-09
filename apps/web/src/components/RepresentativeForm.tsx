'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DIGITS_PATTERN, NAME_PATTERN, digitsOnlyInput, nameOnlyInput, toUpperInput } from '@/lib/formRules';

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const UPPERCASE_FIELDS = new Set([
  'firstName', 'middleName', 'lastName', 'secondLastName', 'profession', 'address', 'birthPlace',
  'workplace', 'workAddress', 'bankName', 'authorizationDescription',
]);

type Props = { mode: 'create' | 'edit'; representative?: any; studentId?: string };

function payload(form: HTMLFormElement) {
  const fd = new FormData(form);
  const d: Record<string, any> = {};
  fd.forEach((v, k) => {
    const s = String(v).trim();
    if (s !== '') d[k] = UPPERCASE_FIELDS.has(k) ? s.toLocaleUpperCase('es-VE') : s;
  });
  d.isPrimary = fd.get('isPrimary') === 'on';
  d.livesWithStudent = fd.get('livesWithStudent') === 'on';
  return d;
}

export default function RepresentativeForm({ mode, representative, studentId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const d = representative || {};

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = payload(e.currentTarget);
      const repData = { ...data };
      delete repData.relationship;
      delete repData.isPrimary;
      delete repData.livesWithStudent;
      delete repData.authorizationDescription;

      const r: any = await api(mode === 'create' ? '/representatives' : `/representatives/${d.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        body: JSON.stringify(repData),
      });

      if (mode === 'create' && studentId) {
        await api(`/representatives/${r.id}/students`, {
          method: 'POST',
          body: JSON.stringify({
            studentId,
            relationship: data.relationship || 'AUTORIZADO',
            isPrimary: data.isPrimary === true,
            livesWithStudent: data.livesWithStudent === true,
            authorizationDescription: data.authorizationDescription,
          }),
        });
        router.push(`/students/${studentId}?tab=representantes`);
      } else {
        router.push(`/representatives/${r.id || d.id}`);
      }
    } catch (x: any) {
      setError(Array.isArray(x?.message) ? x.message.join(', ') : x?.message || 'No fue posible guardar');
    } finally {
      setSaving(false);
    }
  }

  const nameProps = {
    pattern: NAME_PATTERN,
    title: 'Solo se permiten letras, espacios, guiones y apóstrofes.',
    onInput: nameOnlyInput,
  };
  const digitsProps = {
    inputMode: 'numeric' as const,
    pattern: DIGITS_PATTERN,
    title: 'Ingrese únicamente números, sin puntos, letras ni guiones.',
    onInput: digitsOnlyInput,
  };

  return <form className="stack" onSubmit={submit}>{error && <div className="alert">{error}</div>}
    <section className="card form-section"><div className="section-head"><div><h2>Identificación y contacto</h2><p>Nacionalidad y número de cédula se registran en campos separados.</p></div><span className="step-pill">01</span></div><div className="form-grid cols-3">
      <div><label>Nacionalidad *</label><select className="input" name="nationality" defaultValue={d.nationality || 'VENEZOLANO'} required><option value="VENEZOLANO">V</option><option value="EXTRANJERO">E</option></select></div>
      <div><label>Cédula *</label><input className="input" name="identityNumber" defaultValue={d.identityNumber || ''} placeholder="12345678" maxLength={12} required {...digitsProps} /></div>
      <div><label>Sexo</label><select className="input" name="sex" defaultValue={d.sex || ''}><option value="">NO INDICADO</option><option value="MASCULINO">MASCULINO</option><option value="FEMENINO">FEMENINO</option></select></div>
      <div><label>Primer nombre *</label><input className="input uppercase" name="firstName" defaultValue={d.firstName || ''} required {...nameProps} /></div>
      <div><label>Segundo nombre</label><input className="input uppercase" name="middleName" defaultValue={d.middleName || ''} {...nameProps} /></div>
      <div><label>Primer apellido *</label><input className="input uppercase" name="lastName" defaultValue={d.lastName || ''} required {...nameProps} /></div>
      <div><label>Segundo apellido</label><input className="input uppercase" name="secondLastName" defaultValue={d.secondLastName || ''} {...nameProps} /></div>
      <div><label>Teléfono principal *</label><input className="input" name="phone1" defaultValue={d.phone1 || ''} placeholder="04121234567" maxLength={15} required {...digitsProps} /></div>
      <div><label>Segundo teléfono</label><input className="input" name="phone2" defaultValue={d.phone2 || ''} maxLength={15} {...digitsProps} /></div>
      <div><label>Correo electrónico</label><input className="input" type="email" name="email" defaultValue={d.email || ''} /></div>
      <div><label>Fecha de nacimiento</label><input className="input" type="date" name="birthDate" max={new Date().toISOString().slice(0, 10)} defaultValue={d.birthDate ? String(d.birthDate).slice(0, 10) : ''} /></div>
      <div><label>Lugar de nacimiento</label><input className="input uppercase" name="birthPlace" defaultValue={d.birthPlace || ''} onInput={toUpperInput} /></div>
      <div><label>Grupo sanguíneo</label><select className="input" name="bloodType" defaultValue={d.bloodType || ''}>{BLOOD_TYPES.map((x) => <option key={x || 'none'} value={x}>{x || 'NO INDICADO'}</option>)}</select></div>
      <div className="span-3"><label>Dirección *</label><textarea className="input textarea uppercase" name="address" defaultValue={d.address || ''} onInput={toUpperInput} required /></div>
    </div></section>

    <section className="card form-section"><div className="section-head"><div><h2>Información laboral</h2><p>Profesión y datos del lugar de trabajo.</p></div><span className="step-pill">02</span></div><div className="form-grid cols-3">
      <div><label>Profesión u oficio</label><input className="input uppercase" name="profession" defaultValue={d.profession || ''} onInput={toUpperInput} /></div>
      <div><label>Lugar de trabajo</label><input className="input uppercase" name="workplace" defaultValue={d.workplace || ''} onInput={toUpperInput} /></div>
      <div><label>Teléfono del trabajo</label><input className="input" name="workPhone" defaultValue={d.workPhone || ''} maxLength={15} {...digitsProps} /></div>
      <div className="span-3"><label>Dirección de trabajo</label><input className="input uppercase" name="workAddress" defaultValue={d.workAddress || ''} onInput={toUpperInput} /></div>
    </div></section>

    <section className="card form-section"><div className="section-head"><div><h2>Información bancaria</h2><p>Datos de cuenta declarados por el representante.</p></div><span className="step-pill">03</span></div><div className="form-grid cols-3">
      <div><label>Banco</label><input className="input uppercase" name="bankName" defaultValue={d.bankName || ''} onInput={toUpperInput} /></div>
      <div><label>Tipo de cuenta</label><select className="input" name="accountType" defaultValue={d.accountType || ''}><option value="">NO INDICADO</option><option value="CORRIENTE">CORRIENTE</option><option value="AHORRO">AHORRO</option><option value="OTRA">OTRA</option></select></div>
      <div><label>Número de cuenta</label><input className="input" name="accountNumber" defaultValue={d.accountNumber || ''} maxLength={24} {...digitsProps} /></div>
    </div></section>

    {studentId && mode === 'create' && <section className="card form-section"><div className="section-head"><div><h2>Relación con el estudiante</h2><p>Al guardar, el representante quedará vinculado automáticamente al estudiante.</p></div><span className="step-pill">04</span></div><div className="form-grid cols-3">
      <div><label>Parentesco</label><select className="input" name="relationship"><option value="MADRE">MADRE</option><option value="PADRE">PADRE</option><option value="AUTORIZADO">AUTORIZADO</option><option value="OTRO">OTRO</option></select></div>
      <div><label>Descripción de autorización</label><input className="input uppercase" name="authorizationDescription" onInput={toUpperInput} /></div><div></div>
      <label className="check-card"><input type="checkbox" name="isPrimary" defaultChecked /><span><strong>Representante principal</strong><small>Contacto principal del estudiante.</small></span></label>
      <label className="check-card"><input type="checkbox" name="livesWithStudent" /><span><strong>Vive con el estudiante</strong><small>Se refleja en la ficha familiar.</small></span></label>
    </div></section>}

    <div className="action-bar"><button type="button" className="btn secondary" onClick={() => router.back()}>Cancelar</button><button className="btn" disabled={saving}>{saving ? 'Guardando…' : mode === 'create' ? 'Guardar representante' : 'Guardar cambios'}</button></div>
  </form>;
}
