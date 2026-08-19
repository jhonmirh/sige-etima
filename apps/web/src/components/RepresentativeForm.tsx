'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DIGITS_PATTERN, NAME_PATTERN, digitsOnlyInput, nameOnlyInput, toUpperInput } from '@/lib/formRules';
import { calculateAge, latestBirthDateForMinimumAge } from '@/lib/age';
import { VENEZUELA_BANKS, bankOptionLabel, hasCatalogBankName } from '@/lib/venezuelaBanks';

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
  const [relationship, setRelationship] = useState('MADRE');
  const d = representative || {};
  const [birthDate, setBirthDate] = useState(d.birthDate ? String(d.birthDate).slice(0, 10) : '');
  const age = useMemo(() => calculateAge(birthDate), [birthDate]);
  const maxBirthDate = latestBirthDateForMinimumAge(18);
  const ageInvalid = age !== null && age < 18;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!birthDate || age === null || age < 18) {
      setError('El representante debe tener al menos 18 años cumplidos. Revise la fecha de nacimiento.');
      return;
    }
    setSaving(true);
    try {
      const data = payload(e.currentTarget);
      const requiresDescription = relationship === 'AUTORIZADO' || relationship === 'OTRO';
      if (studentId && mode === 'create' && requiresDescription && !String(data.authorizationDescription || '').trim()) {
        setError(relationship === 'OTRO'
          ? 'La descripción es obligatoria cuando el parentesco es OTRO'
          : 'La descripción de autorización es obligatoria cuando el parentesco es AUTORIZADO');
        setSaving(false);
        return;
      }
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
            relationship,
            isPrimary: data.isPrimary === true,
            livesWithStudent: data.livesWithStudent === true,
            authorizationDescription: requiresDescription ? data.authorizationDescription : undefined,
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
      <div><label>Fecha de nacimiento *</label><input className="input" type="date" name="birthDate" max={maxBirthDate} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required /><small className={ageInvalid ? 'field-error' : 'field-hint'}>Debe tener al menos 18 años cumplidos.</small></div>
      <div><label>Edad actual</label><div className="input read-only">{age === null ? '—' : `${age} AÑOS`}</div></div>
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
      <div><label>Banco</label><select className="input" name="bankName" defaultValue={d.bankName || ''}><option value="">SELECCIONE EL BANCO</option>{d.bankName && !hasCatalogBankName(d.bankName) && <option value={d.bankName}>{String(d.bankName).toLocaleUpperCase('es-VE')} · REGISTRADO</option>}{VENEZUELA_BANKS.map((bank) => <option key={bank.code} value={bank.name}>{bankOptionLabel(bank)}</option>)}</select></div>
      <div><label>Tipo de cuenta</label><select className="input" name="accountType" defaultValue={d.accountType || ''}><option value="">NO INDICADO</option><option value="CORRIENTE">CORRIENTE</option><option value="AHORRO">AHORRO</option><option value="OTRA">OTRA</option></select></div>
      <div><label>Número de cuenta</label><input className="input" name="accountNumber" defaultValue={d.accountNumber || ''} inputMode="numeric" pattern="[0-9]{20}" minLength={20} maxLength={20} title="Debe contener exactamente 20 dígitos numéricos" onInput={digitsOnlyInput} /><small className="field-help">20 dígitos numéricos, sin espacios ni guiones.</small></div>
    </div></section>

    {studentId && mode === 'create' && <section className="card form-section"><div className="section-head"><div><h2>Relación con el estudiante</h2><p>Al guardar, el representante quedará vinculado automáticamente al estudiante.</p></div><span className="step-pill">04</span></div><div className="form-grid cols-3">
      <div><label>Parentesco *</label><select className="input" name="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} required><option value="MADRE">MADRE</option><option value="PADRE">PADRE</option><option value="AUTORIZADO">AUTORIZADO</option><option value="OTRO">OTRO</option></select></div>
      <div className="span-2"><label>Descripción de autorización {relationship === 'AUTORIZADO' || relationship === 'OTRO' ? '*' : ''}</label><input className="input uppercase" name="authorizationDescription" onInput={toUpperInput} placeholder={relationship === 'AUTORIZADO' ? 'INDIQUE QUIÉN AUTORIZA O EL FUNDAMENTO DE LA AUTORIZACIÓN' : relationship === 'OTRO' ? 'DESCRIBA LA RELACIÓN CON EL ESTUDIANTE' : 'NO APLICA'} required={relationship === 'AUTORIZADO' || relationship === 'OTRO'} disabled={relationship !== 'AUTORIZADO' && relationship !== 'OTRO'} />{relationship === 'AUTORIZADO' && <small className="muted">Debe describir la autorización. Sin esta información no se permite crear y vincular al representante.</small>}{relationship === 'OTRO' && <small className="muted">Debe describir de forma específica la relación de esta persona con el estudiante.</small>}</div>
      <label className="check-card"><input type="checkbox" name="isPrimary" defaultChecked /><span><strong>Representante principal</strong><small>Contacto principal del estudiante.</small></span></label>
      <label className="check-card"><input type="checkbox" name="livesWithStudent" /><span><strong>Vive con el estudiante</strong><small>Se refleja en la ficha familiar.</small></span></label>
    </div></section>}

    <div className="action-bar"><button type="button" className="btn secondary" onClick={() => router.back()}>Cancelar</button><button className="btn" disabled={saving}>{saving ? 'Guardando…' : mode === 'create' ? 'Guardar representante' : 'Guardar cambios'}</button></div>
  </form>;
}
