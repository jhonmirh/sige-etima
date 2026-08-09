'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DIGITS_PATTERN, NAME_PATTERN, digitsOnlyInput, nameOnlyInput, toUpperInput } from '@/lib/formRules';

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

type Geography = {
  id: string;
  name: string;
  municipalities: { id: string; name: string; parishes: { id: string; name: string }[] }[];
};

type Props = { mode: 'create' | 'edit'; student?: any };

const UPPERCASE_FIELDS = new Set([
  'schoolIdentityNumber', 'firstName', 'middleName', 'lastName', 'secondLastName', 'birthPlace', 'address',
  'motherName', 'fatherName', 'motherAddress', 'fatherAddress', 'disabilityDetails', 'allergyDetails',
  'originSchool', 'destinationSchool', 'observations',
]);

function cleanPayload(form: HTMLFormElement) {
  const fd = new FormData(form);
  const data: Record<string, any> = {};
  fd.forEach((value, key) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') data[key] = UPPERCASE_FIELDS.has(key) ? trimmed.toLocaleUpperCase('es-VE') : trimmed;
    }
  });
  data.disability = fd.get('disability') === 'on';
  data.medicalReport = fd.get('medicalReport') === 'on';
  data.allergy = fd.get('allergy') === 'on';
  return data;
}

export default function StudentForm({ mode, student }: Props) {
  const router = useRouter();
  const [geo, setGeo] = useState<Geography[]>([]);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [birthStateId, setBirthStateId] = useState(student?.birthStateId || '');
  const [birthMunicipalityId, setBirthMunicipalityId] = useState(student?.birthMunicipalityId || '');
  const [birthParishId, setBirthParishId] = useState(student?.birthParishId || '');
  const [residenceStateId, setResidenceStateId] = useState(student?.residenceStateId || '');
  const [residenceMunicipalityId, setResidenceMunicipalityId] = useState(student?.residenceMunicipalityId || '');
  const [residenceParishId, setResidenceParishId] = useState(student?.residenceParishId || '');
  const [birthDate, setBirthDate] = useState(student?.birthDate ? String(student.birthDate).slice(0, 10) : '');
  const [disability, setDisability] = useState(!!student?.disability);
  const [allergy, setAllergy] = useState(!!student?.allergy);

  useEffect(() => {
    setGeoLoading(true);
    api<Geography[]>('/academic/geography')
      .then((rows) => {
        setGeo(rows);
        if (!rows.some((x) => x.municipalities?.length)) {
          setGeoError('El catálogo territorial no contiene municipios. Reinicia la API para ejecutar la carga inicial del catálogo.');
        }
      })
      .catch(() => setGeoError('No fue posible cargar el catálogo Estado → Municipio → Parroquia.'))
      .finally(() => setGeoLoading(false));
  }, []);

  const birthMunicipalities = useMemo(() => geo.find((x) => x.id === birthStateId)?.municipalities || [], [geo, birthStateId]);
  const birthParishes = useMemo(
    () => birthMunicipalities.find((x) => x.id === birthMunicipalityId)?.parishes || [],
    [birthMunicipalities, birthMunicipalityId],
  );
  const residenceMunicipalities = useMemo(() => geo.find((x) => x.id === residenceStateId)?.municipalities || [], [geo, residenceStateId]);
  const residenceParishes = useMemo(
    () => residenceMunicipalities.find((x) => x.id === residenceMunicipalityId)?.parishes || [],
    [residenceMunicipalities, residenceMunicipalityId],
  );

  const age = useMemo(() => {
    if (!birthDate) return null;
    const born = new Date(`${birthDate}T00:00:00`);
    const now = new Date();
    let years = now.getFullYear() - born.getFullYear();
    const m = now.getMonth() - born.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < born.getDate())) years--;
    return years >= 0 ? years : null;
  }, [birthDate]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = cleanPayload(e.currentTarget);
      const result: any = await api(mode === 'create' ? '/students' : `/students/${student.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        body: JSON.stringify(data),
      });
      router.push(`/students/${result.id || student.id}`);
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join(', ') : err?.message || 'No fue posible guardar el estudiante');
    } finally {
      setSaving(false);
    }
  }

  const d = student || {};
  const maxBirthDate = new Date().toISOString().slice(0, 10);

  const nameProps = {
    pattern: NAME_PATTERN,
    title: 'Solo se permiten letras, espacios, guiones y apóstrofes.',
    onInput: nameOnlyInput,
  };
  const idProps = {
    inputMode: 'numeric' as const,
    pattern: DIGITS_PATTERN,
    title: 'Ingrese únicamente números, sin puntos, letras ni guiones.',
    onInput: digitsOnlyInput,
  };

  return (
    <form className="stack" onSubmit={submit}>
      {error && <div className="alert">{error}</div>}

      <section className="card form-section">
        <div className="section-head"><div><h2>Identificación</h2><p>La nacionalidad se registra por separado de la cédula. La cédula acepta solo números.</p></div><span className="step-pill">01</span></div>
        <div className="form-grid cols-3">
          <div><label>Nacionalidad *</label><select className="input" name="nationality" defaultValue={d.nationality || 'VENEZOLANO'} required><option value="VENEZOLANO">V</option><option value="EXTRANJERO">E</option></select></div>
          <div><label>Cédula *</label><input className="input" name="identityNumber" defaultValue={d.identityNumber || ''} placeholder="12345678" maxLength={12} required {...idProps} /></div>
          <div><label>Cédula escolar</label><input className="input uppercase" name="schoolIdentityNumber" defaultValue={d.schoolIdentityNumber || ''} onInput={toUpperInput} /></div>
          <div><label>Primer nombre *</label><input className="input uppercase" name="firstName" defaultValue={d.firstName || ''} required {...nameProps} /></div>
          <div><label>Segundo nombre</label><input className="input uppercase" name="middleName" defaultValue={d.middleName || ''} {...nameProps} /></div>
          <div><label>Primer apellido *</label><input className="input uppercase" name="lastName" defaultValue={d.lastName || ''} required {...nameProps} /></div>
          <div><label>Segundo apellido</label><input className="input uppercase" name="secondLastName" defaultValue={d.secondLastName || ''} {...nameProps} /></div>
          <div><label>Sexo *</label><select className="input" name="sex" defaultValue={d.sex || 'MASCULINO'} required><option value="MASCULINO">MASCULINO</option><option value="FEMENINO">FEMENINO</option></select></div>
          <div><label>Estado civil</label><select className="input" name="maritalStatus" defaultValue={d.maritalStatus || ''}><option value="">NO INDICADO</option><option value="SOLTERO">SOLTERO(A)</option><option value="CASADO">CASADO(A)</option><option value="VIUDO">VIUDO(A)</option><option value="DIVORCIADO">DIVORCIADO(A)</option><option value="UNION_ESTABLE">UNIÓN ESTABLE</option></select></div>
          <div><label>Teléfono</label><input className="input" name="phone" defaultValue={d.phone || ''} placeholder="04121234567" maxLength={15} {...idProps} /></div>
          <div><label>Correo electrónico</label><input className="input" type="email" name="email" defaultValue={d.email || ''} /></div>
        </div>
      </section>

      <section className="card form-section">
        <div className="section-head"><div><h2>Nacimiento y residencia</h2><p>Selecciona primero el estado; el sistema mostrará sus municipios y, después, las parroquias del municipio elegido.</p></div><span className="step-pill">02</span></div>
        {geoLoading && <div className="info-banner">Cargando catálogo territorial…</div>}
        {geoError && <div className="alert">{geoError}</div>}
        <div className="form-grid cols-3">
          <div><label>Fecha de nacimiento *</label><input className="input" name="birthDate" type="date" max={maxBirthDate} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required /></div>
          <div><label>Edad actual</label><div className="input read-only">{age === null ? '—' : `${age} AÑOS`}</div></div>
          <div><label>Lugar de nacimiento *</label><input className="input uppercase" name="birthPlace" defaultValue={d.birthPlace || ''} onInput={toUpperInput} required /></div>
          <div><label>Estado de nacimiento *</label><select className="input" name="birthStateId" value={birthStateId} onChange={(e) => { setBirthStateId(e.target.value); setBirthMunicipalityId(''); setBirthParishId(''); }} required><option value="">SELECCIONE</option>{geo.map((x) => <option key={x.id} value={x.id}>{x.name.toLocaleUpperCase('es-VE')}</option>)}</select></div>
          <div><label>Municipio de nacimiento *</label><select className="input" name="birthMunicipalityId" value={birthMunicipalityId} onChange={(e) => { setBirthMunicipalityId(e.target.value); setBirthParishId(''); }} disabled={!birthStateId || !birthMunicipalities.length} required><option value="">SELECCIONE</option>{birthMunicipalities.map((x) => <option key={x.id} value={x.id}>{x.name.toLocaleUpperCase('es-VE')}</option>)}</select></div>
          <div><label>Parroquia de nacimiento *</label><select className="input" name="birthParishId" value={birthParishId} onChange={(e) => setBirthParishId(e.target.value)} disabled={!birthMunicipalityId || !birthParishes.length} required><option value="">SELECCIONE</option>{birthParishes.map((x) => <option key={x.id} value={x.id}>{x.name.toLocaleUpperCase('es-VE')}</option>)}</select></div>
          <div><label>Estado de residencia *</label><select className="input" name="residenceStateId" value={residenceStateId} onChange={(e) => { setResidenceStateId(e.target.value); setResidenceMunicipalityId(''); setResidenceParishId(''); }} required><option value="">SELECCIONE</option>{geo.map((x) => <option key={x.id} value={x.id}>{x.name.toLocaleUpperCase('es-VE')}</option>)}</select></div>
          <div><label>Municipio de residencia *</label><select className="input" name="residenceMunicipalityId" value={residenceMunicipalityId} onChange={(e) => { setResidenceMunicipalityId(e.target.value); setResidenceParishId(''); }} disabled={!residenceStateId || !residenceMunicipalities.length} required><option value="">SELECCIONE</option>{residenceMunicipalities.map((x) => <option key={x.id} value={x.id}>{x.name.toLocaleUpperCase('es-VE')}</option>)}</select></div>
          <div><label>Parroquia de residencia *</label><select className="input" name="residenceParishId" value={residenceParishId} onChange={(e) => setResidenceParishId(e.target.value)} disabled={!residenceMunicipalityId || !residenceParishes.length} required><option value="">SELECCIONE</option>{residenceParishes.map((x) => <option key={x.id} value={x.id}>{x.name.toLocaleUpperCase('es-VE')}</option>)}</select></div>
        </div>
        <div style={{ marginTop: 14 }}><label>Dirección completa *</label><textarea className="input textarea uppercase" name="address" defaultValue={d.address || ''} onInput={toUpperInput} required /></div>
      </section>

      <section className="card form-section">
        <div className="section-head"><div><h2>Padres y convivencia</h2><p>Los nombres se registran en mayúscula y las cédulas solo admiten números.</p></div><span className="step-pill">03</span></div>
        <div className="form-grid cols-3">
          <div><label>Nombre de la madre</label><input className="input uppercase" name="motherName" defaultValue={d.motherName || ''} {...nameProps} /></div>
          <div><label>Cédula de la madre</label><input className="input" name="motherIdentity" defaultValue={d.motherIdentity || ''} maxLength={12} {...idProps} /></div>
          <div><label>Dirección de la madre</label><input className="input uppercase" name="motherAddress" defaultValue={d.motherAddress || ''} onInput={toUpperInput} /></div>
          <div><label>Nombre del padre</label><input className="input uppercase" name="fatherName" defaultValue={d.fatherName || ''} {...nameProps} /></div>
          <div><label>Cédula del padre</label><input className="input" name="fatherIdentity" defaultValue={d.fatherIdentity || ''} maxLength={12} {...idProps} /></div>
          <div><label>Dirección del padre</label><input className="input uppercase" name="fatherAddress" defaultValue={d.fatherAddress || ''} onInput={toUpperInput} /></div>
          <div><label>Vive con *</label><select className="input" name="livingWith" defaultValue={d.livingWith || 'MADRE'}><option value="MADRE">MADRE</option><option value="PADRE">PADRE</option><option value="AUTORIZADO">PERSONA AUTORIZADA</option></select></div>
        </div>
      </section>

      <section className="card form-section">
        <div className="section-head"><div><h2>Salud</h2><p>Información declarativa para la ficha escolar; no sustituye un informe médico.</p></div><span className="step-pill">04</span></div>
        <div className="form-grid cols-3">
          <div><label>Grupo sanguíneo</label><select className="input" name="bloodType" defaultValue={d.bloodType || ''}>{BLOOD_TYPES.map((x) => <option key={x || 'none'} value={x}>{x || 'NO INDICADO'}</option>)}</select></div>
          <label className="check-card"><input type="checkbox" name="disability" checked={disability} onChange={(e) => setDisability(e.target.checked)} /><span><strong>Posee discapacidad</strong><small>Habilita el detalle correspondiente.</small></span></label>
          <label className="check-card"><input type="checkbox" name="medicalReport" defaultChecked={!!d.medicalReport} /><span><strong>Presenta informe médico</strong><small>Constancia documental disponible.</small></span></label>
          {disability && <div className="span-3"><label>Descripción de discapacidad</label><textarea className="input textarea uppercase" name="disabilityDetails" defaultValue={d.disabilityDetails || ''} onInput={toUpperInput} /></div>}
          <label className="check-card"><input type="checkbox" name="allergy" checked={allergy} onChange={(e) => setAllergy(e.target.checked)} /><span><strong>Presenta alergias</strong><small>Registre la especificación.</small></span></label>
          {allergy && <div className="span-2"><label>Especificación de alergias</label><textarea className="input textarea uppercase" name="allergyDetails" defaultValue={d.allergyDetails || ''} onInput={toUpperInput} /></div>}
        </div>
      </section>

      <section className="card form-section">
        <div className="section-head"><div><h2>Procedencia y observaciones</h2><p>Datos complementarios de la ficha escolar.</p></div><span className="step-pill">05</span></div>
        <div className="form-grid">
          <div><label>Plantel de procedencia</label><input className="input uppercase" name="originSchool" defaultValue={d.originSchool || ''} onInput={toUpperInput} /></div>
          <div><label>Plantel de destino</label><input className="input uppercase" name="destinationSchool" defaultValue={d.destinationSchool || ''} onInput={toUpperInput} /></div>
        </div>
        <div style={{ marginTop: 14 }}><label>Observaciones</label><textarea className="input textarea large uppercase" name="observations" defaultValue={d.observations || ''} onInput={toUpperInput} /></div>
      </section>

      <div className="action-bar">
        <button className="btn secondary" type="button" onClick={() => router.back()}>Cancelar</button>
        <button className="btn" disabled={saving}>{saving ? 'Guardando…' : mode === 'create' ? 'Guardar estudiante' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}
