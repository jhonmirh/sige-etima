'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, Search, TriangleAlert, UserPlus } from 'lucide-react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { digitsOnlyInput } from '@/lib/formRules';
import { calculateAge } from '@/lib/age';

const GARMENTS = ['', '10', '11', '12', '13', '14', '15', '16', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const LITERALS = ['A', 'B', 'C', 'D'];
function lastApprovedYearOptions(plan: any) {
  const primaryLastGrade = '6° GRADO';
  if (plan?.code === '31059') return [primaryLastGrade, ...[1, 2, 3, 4].map((n) => `${n}° AÑO`)];
  if (plan?.code === '41049') return [primaryLastGrade, ...[1, 2, 3, 4, 5].map((n) => `${n}° AÑO`)];
  const limit = Math.max(1, Number(plan?.maxGrade || 1) - 1);
  return [primaryLastGrade, ...Array.from({ length: limit }, (_, i) => `${i + 1}° AÑO`)];
}

function approvedSecondaryYear(value: string) {
  if (!value || value.includes('GRADO')) return 0;
  return Number((value.match(/\d+/) || [])[0] || 0);
}

function idLabel(x: any) {
  return x?.identityNumber ? `${x.nationality === 'VENEZOLANO' ? 'V' : 'E'}-${x.identityNumber}` : 'SIN CÉDULA';
}

function conditionDescription(condition: string, grade: number) {
  if (condition === 'MATERIA_PENDIENTE') {
    if (grade === 1) return 'El estudiante ingresará a 1° AÑO y cursará todas las materias del plan, además de 1 o 2 materias pendientes provenientes de 6° GRADO.';
    return `El estudiante será promovido a ${grade}° AÑO y cursará todas las materias de ese grado, además de 1 o 2 materias pendientes de ${grade - 1}° AÑO.`;
  }
  if (condition === 'REPITIENTE') {
    return `El estudiante permanecerá en ${grade}° AÑO y cursará únicamente las materias reprobadas que seleccione.`;
  }
  return `El estudiante ingresará como REGULAR y cursará todas las materias correspondientes a ${grade}° AÑO.`;
}

function studentEnrollmentMissingFields(student: any) {
  if (!student) return ['Estudiante'];
  const required: [string, string][] = [
    ['nationality', 'Nacionalidad'], ['identityNumber', 'Cédula'], ['firstName', 'Primer nombre'], ['lastName', 'Primer apellido'],
    ['sex', 'Sexo'], ['birthDate', 'Fecha de nacimiento'], ['birthPlace', 'Lugar de nacimiento'], ['birthStateId', 'Estado de nacimiento'],
    ['birthMunicipalityId', 'Municipio de nacimiento'], ['birthParishId', 'Parroquia de nacimiento'], ['address', 'Dirección completa'],
    ['residenceStateId', 'Estado de residencia'], ['residenceMunicipalityId', 'Municipio de residencia'], ['residenceParishId', 'Parroquia de residencia'],
    ['livingWith', 'Vive con'], ['phone', 'Teléfono'], ['email', 'Correo electrónico'],
  ];
  const missing = required.filter(([field]) => { const value = student?.[field]; return value === null || value === undefined || (typeof value === 'string' && !value.trim()); }).map(([, label]) => label);
  if (student?.disability && !student?.disabilityDetails?.trim()) missing.push('Descripción de discapacidad');
  if (student?.allergy && !student?.allergyDetails?.trim()) missing.push('Descripción de alergias');
  return missing;
}

function representativeMissingFields(rep: any) {
  const required: [string, string][] = [['nationality','Nacionalidad'],['identityNumber','Cédula'],['firstName','Primer nombre'],['lastName','Primer apellido'],['address','Dirección'],['birthDate','Fecha de nacimiento'],['phone1','Teléfono principal']];
  const missing = required.filter(([field]) => { const value = rep?.[field]; return value === null || value === undefined || (typeof value === 'string' && !value.trim()); }).map(([, label]) => label);
  const age = rep?.birthDate ? calculateAge(String(rep.birthDate).slice(0, 10)) : null;
  if (age === null || age < 18) missing.push('Edad mínima 18 años');
  return missing;
}

export default function NewEnrollment() {
  const router = useRouter();
  const [years, setYears] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [nationality, setNationality] = useState('VENEZOLANO');
  const [identity, setIdentity] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [yearId, setYearId] = useState('');
  const [planId, setPlanId] = useState('');
  const [mentionId, setMentionId] = useState('');
  const [grade, setGrade] = useState(1);
  const [sectionId, setSectionId] = useState('');
  const [lastApprovedYear, setLastApprovedYear] = useState('');
  const [literal, setLiteral] = useState('');
  const [recordedLiteral, setRecordedLiteral] = useState('');
  const [recordedGrade, setRecordedGrade] = useState<number | null>(null);
  const [entryCondition, setEntryCondition] = useState('REGULAR');
  const [failedSubjectIds, setFailedSubjectIds] = useState<string[]>([]);
  const [manualPendingSubjectNames, setManualPendingSubjectNames] = useState<string[]>(['', '']);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api('/academic/years'), api('/academic/plans')])
      .then(([y, p]: any[]) => {
        setYears(y);
        setPlans(p);
        const active = y.find((x: any) => x.active) || y[0];
        if (active) setYearId(active.id);
        if (p[0]) {
          setPlanId(p[0].id);
          setMentionId(p[0].mentions?.[0]?.id || '');
        }
      })
      .catch((e: any) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!yearId || !planId) return;
    if (!mentionId) {
      setSections([]);
      setSectionId('');
      return;
    }
    api(`/academic/sections?academicYearId=${yearId}&studyPlanId=${planId}&gradeLevel=${grade}&mentionId=${mentionId}`)
      .then((s: any[]) => {
        setSections(s);
        setSectionId(s[0]?.id || '');
      })
      .catch((e: any) => setErr(e.message));
  }, [yearId, planId, mentionId, grade]);

  useEffect(() => {
    if (grade !== 1) setLiteral(recordedLiteral);
    else if (recordedLiteral && !literal) setLiteral(recordedLiteral);
  }, [grade, recordedLiteral]);

  useEffect(() => {
    setFailedSubjectIds([]);
    setManualPendingSubjectNames(['', '']);
  }, [entryCondition, grade, planId]);

  const plan = plans.find((x) => x.id === planId);
  const activeMentions = plan?.mentions || [];
  const activeLinkedRepresentatives = (student?.representatives || []).filter((x: any) => x.representative?.active !== false);
  const completeRepresentativeLinks = activeLinkedRepresentatives.filter((x: any) => representativeMissingFields(x.representative).length === 0);
  const hasRep = completeRepresentativeLinks.length > 0;
  const studentProfileMissing = studentEnrollmentMissingFields(student);
  const studentProfileComplete = !!student && studentProfileMissing.length === 0;
  const studentAge = student?.birthDate ? calculateAge(String(student.birthDate).slice(0, 10)) : null;
  const validStudentAge = studentAge !== null && studentAge >= 10;
  const hasInstitutionHistory = (student?.enrollments?.length || 0) > 0;
  const approvedYearOptions = lastApprovedYearOptions(plan);
  const lastApprovedNumber = approvedSecondaryYear(lastApprovedYear);
  const gradeRegression = (recordedGrade !== null && grade < recordedGrade) || (lastApprovedNumber > 0 && grade <= lastApprovedNumber);

  useEffect(() => {
    if (lastApprovedYear && !approvedYearOptions.includes(lastApprovedYear)) setLastApprovedYear('');
  }, [planId]);

  const availableFailedSubjects = useMemo(() => {
    if (!plan?.subjects) return [];
    const sourceGrade = entryCondition === 'MATERIA_PENDIENTE' ? grade - 1 : grade;
    if (entryCondition === 'REGULAR' || sourceGrade < 1) return [];
    return plan.subjects.filter((x: any) => x.active !== false && Number(x.gradeLevel) === sourceGrade);
  }, [plan, entryCondition, grade]);

  const normalizedManualPendingNames = manualPendingSubjectNames.map((x) => x.trim()).filter(Boolean);
  const uniqueManualPendingNames = Array.from(new Set(normalizedManualPendingNames.map((x) => x.toLocaleUpperCase('es-VE'))));
  const manualConditionValid =
    entryCondition === 'REGULAR' ||
    (entryCondition === 'MATERIA_PENDIENTE' && grade === 1 && uniqueManualPendingNames.length >= 1 && uniqueManualPendingNames.length <= 2) ||
    (entryCondition === 'MATERIA_PENDIENTE' && grade > 1 && failedSubjectIds.length >= 1 && failedSubjectIds.length <= 2) ||
    (entryCondition === 'REPITIENTE' && failedSubjectIds.length > 2);

  const missingOriginSchool = !!student && !student?.originSchool?.trim();

  async function search(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const rows: any[] = await api(`/students?search=${encodeURIComponent(identity)}`);
      const exact = rows.find((x) => x.active !== false && x.identityNumber === identity && x.nationality === nationality);
      if (!exact) throw new Error('No se encontró un estudiante activo con esa nacionalidad y cédula');
      const loaded: any = await api(`/students/${exact.id}`);
      setStudent(loaded);
      const latest = loaded.enrollments?.[0];
      const historicalLiteral = loaded.enrollments?.find((x: any) => x.literal && LITERALS.includes(x.literal))?.literal || '';
      setLastApprovedYear(latest?.lastApprovedYear || '');
      setRecordedLiteral(historicalLiteral);
      setLiteral(historicalLiteral);
      setRecordedGrade(latest?.gradeLevel ? Number(latest.gradeLevel) : null);
      setEntryCondition('REGULAR');
      setFailedSubjectIds([]);
      setManualPendingSubjectNames(['', '']);
    } catch (e: any) {
      setStudent(null);
      setLastApprovedYear('');
      setLiteral('');
      setRecordedLiteral('');
      setRecordedGrade(null);
      setEntryCondition('REGULAR');
      setFailedSubjectIds([]);
      setManualPendingSubjectNames(['', '']);
      setErr(e.message);
    }
  }

  function toggleFailedSubject(id: string) {
    setFailedSubjectIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const issues: string[] = [];

    if (!student) issues.push('Debe buscar y seleccionar un estudiante registrado.');
    if (student && !validStudentAge) issues.push('El estudiante debe tener al menos 10 años cumplidos.');
    if (student && !studentProfileComplete) issues.push(`Debe completar la ficha integral del estudiante: ${studentProfileMissing.join(', ')}.`);
    if (!hasRep) issues.push('Debe vincular al menos un representante activo, adulto y con sus datos obligatorios completos.');
    if (hasInstitutionHistory) issues.push('El estudiante ya tiene historial en ETIMA; corresponde utilizar Reinscripción.');
    if (!yearId) issues.push('Debe seleccionar el año escolar.');
    if (!planId) issues.push('Debe seleccionar el plan de estudio.');
    if (!mentionId) issues.push('Debe seleccionar la mención.');
    if (!sectionId) issues.push('Debe seleccionar una sección.');
    if (!String(f.get('registrationDate') || '').trim()) issues.push('La fecha de inscripción es obligatoria.');
    if (!lastApprovedYear) issues.push('Debe indicar el último año aprobado.');
    if (grade === 1 && !literal) issues.push('El literal A, B, C o D es obligatorio para ingreso a 1° AÑO.');
    if (missingOriginSchool) issues.push('Debe registrar el plantel de procedencia en la ficha del estudiante.');
    if (entryCondition === 'MATERIA_PENDIENTE' && grade === 1 && normalizedManualPendingNames.length !== uniqueManualPendingNames.length) issues.push('Las materias pendientes de 6° GRADO no pueden estar repetidas.');
    if (!manualConditionValid) issues.push(entryCondition === 'MATERIA_PENDIENTE'
      ? (grade === 1 ? 'MATERIA PENDIENTE para ingreso a 1° AÑO requiere registrar por nombre 1 o 2 materias pendientes provenientes de 6° GRADO.' : 'MATERIA PENDIENTE requiere seleccionar 1 o 2 materias del año inmediatamente anterior.')
      : 'REPITIENTE requiere seleccionar más de 2 materias reprobadas del mismo año.');

    const meters = Number(f.get('meters') || 0);
    const centimeters = Number(f.get('centimeters') || 0);
    const kg = Number(f.get('kg') || 0);
    const grams = Number(f.get('grams') || 0);
    const heightCm = meters * 100 + centimeters;
    const weightGrams = kg * 1000 + grams;
    if (heightCm < 50 || heightCm > 250) issues.push('La estatura de ingreso es obligatoria y debe estar entre 50 y 250 cm.');
    if (weightGrams < 10000 || weightGrams > 300000) issues.push('El peso de ingreso es obligatorio y debe estar entre 10 y 300 kg.');

    if (issues.length) {
      setErr(`No se puede formalizar la matrícula. Corrija: ${issues.join(' · ')}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!student) return;

    if (gradeRegression && !window.confirm(`ALERTA ACADÉMICA

El expediente contiene un grado/año registrado superior o igual al grado que intenta seleccionar (${grade}° AÑO).

Si se trata de una corrección de primera matrícula puede continuar, pero confirme que verificó el expediente del estudiante.

¿Desea continuar?`)) return;

    setSaving(true);
    setErr('');
    try {
      const body: any = {
        studentId: student.id,
        academicYearId: yearId,
        studyPlanId: planId,
        sectionId,
        gradeLevel: grade,
        registrationDate: f.get('registrationDate'),
        lastApprovedYear,
        literal: grade === 1 ? literal : undefined,
        condition: entryCondition,
        failedSubjectIds: failedSubjectIds.length ? failedSubjectIds : undefined,
        manualPendingSubjectNames: entryCondition === 'MATERIA_PENDIENTE' && grade === 1 ? uniqueManualPendingNames : undefined,
        heightCm,
        weightGrams,
        shirtSize: f.get('shirtSize') || undefined,
        pantSize: f.get('pantSize') || undefined,
        shoeSize: f.get('shoeSize') ? Number(f.get('shoeSize')) : undefined,
      };
      const created = await api('/enrollments', { method: 'POST', body: JSON.stringify(body) });
      router.push(`/enrollments/${created.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell title="Primera matrícula">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Ingreso al plantel</span>
          <h1>Primera matrícula</h1>
          <p>Para estudiantes que ingresan por primera vez a ETIMA. Si ya cursaron en la institución, utilice Reinscripción: allí la condición se determina automáticamente por las definitivas.</p>
        </div>
        <Link className="btn secondary" href="/enrollments"><ArrowLeft size={17} /> Volver</Link>
      </div>

      {err && <div className="alert">{err}</div>}

      <form className="card form-section enrollment-lookup" onSubmit={search}>
        <div className="section-head"><div><h2>1. Buscar estudiante registrado</h2><p>El estudiante debe existir previamente en la ficha integral.</p></div><span className="step-pill">1</span></div>
        <div className="form-grid reenroll-search-grid">
          <div><label>Nacionalidad</label><select className="input" value={nationality} onChange={(e) => setNationality(e.target.value)}><option value="VENEZOLANO">V</option><option value="EXTRANJERO">E</option></select></div>
          <div className="span-2"><label>Cédula</label><input className="input" inputMode="numeric" value={identity} onChange={(e) => setIdentity(e.target.value.replace(/\D/g, ''))} onInput={digitsOnlyInput} required /></div>
          <button className="btn lookup-btn"><Search size={17} /> Buscar</button>
        </div>
      </form>

      {student && <form className="stack" onSubmit={submit} noValidate>
        <section className="card form-section">
          <div className="section-head"><div><h2>2. Estudiante</h2><p>Verifique la identidad, procedencia y representante antes de continuar.</p></div><span className="step-pill">2</span></div>
          <div className="student-reenroll-head">
            <div className="avatar-lg">{student.firstName[0]}{student.lastName[0]}</div>
            <div><h3>{[student.firstName, student.middleName, student.lastName, student.secondLastName].filter(Boolean).join(' ')}</h3><p>{idLabel(student)} · {studentAge === null ? 'EDAD SIN CALCULAR' : `${studentAge} AÑOS`} · {student.sex || 'SEXO SIN REGISTRAR'}</p><p className="muted">{student.phone || 'TELÉFONO SIN REGISTRAR'} · {student.email || 'CORREO SIN REGISTRAR'}</p><p className="muted">Dirección: <strong>{student.address || 'SIN REGISTRAR'}</strong> · Plantel de procedencia: <strong>{student.originSchool || 'SIN REGISTRAR'}</strong></p><p className="muted">Representante: <strong>{completeRepresentativeLinks[0]?.representative ? `${completeRepresentativeLinks[0].representative.firstName} ${completeRepresentativeLinks[0].representative.lastName}` : 'SIN REPRESENTANTE ADULTO COMPLETO'}</strong></p></div>
            <Link className="btn secondary" href={`/students/${student.id}/edit`}>Actualizar ficha</Link>
          </div>
          {!studentProfileComplete && <div className="warning-banner"><TriangleAlert size={20} /><div><strong>Ficha integral incompleta</strong><span>No se puede matricular, reincorporar ni reinscribir hasta completar: {studentProfileMissing.join(', ')}.</span></div><Link className="btn secondary" href={`/students/${student.id}/edit`}>Completar ficha</Link></div>}
          {!validStudentAge && <div className="warning-banner"><TriangleAlert size={20} /><div><strong>Edad del estudiante no válida</strong><span>La matrícula exige una edad mínima de 10 años cumplidos. Corrija la fecha de nacimiento en la ficha integral.</span></div><Link className="btn secondary" href={`/students/${student.id}/edit`}>Corregir fecha</Link></div>}
          {!hasRep && <div className="warning-banner"><div><strong>Falta representante adulto válido</strong><span>No es posible formalizar matrícula sin al menos un representante activo, con 18 años o más y sus datos obligatorios completos.</span></div><div className="row-actions"><Link className="btn secondary" href={`/students/${student.id}/representatives/link`}>Asignar existente</Link><Link className="btn" href={`/representatives/new?studentId=${student.id}`}>Crear representante</Link></div></div>}
          {hasInstitutionHistory && <div className="warning-banner"><TriangleAlert size={20} /><div><strong>Este estudiante ya posee historial en ETIMA.</strong><span>No corresponde Primera matrícula. Utilice Reinscripción para que la condición REGULAR, MATERIA PENDIENTE o REPITIENTE provenga automáticamente de las definitivas del sistema.</span></div><Link className="btn secondary" href="/enrollments/reenroll">Ir a Reinscripción</Link></div>}
        </section>

        <section className="card form-section">
          <div className="section-head"><div><h2>3. Datos académicos de ingreso</h2><p>Seleccione el año, plan, grado y sección de la primera matrícula.</p></div><span className="step-pill">3</span></div>
          <div className="form-grid cols-3">
            <div><label>Año escolar *</label><select className="input" value={yearId} onChange={(e) => setYearId(e.target.value)} required>{years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.active ? ' · ACTIVO' : ''}</option>)}</select></div>
            <div><label>Plan de estudio *</label><select className="input" value={planId} onChange={(e) => { const id = e.target.value; const next = plans.find((p: any) => p.id === id); setPlanId(id); setMentionId(next?.mentions?.[0]?.id || ''); setGrade(1); setEntryCondition('REGULAR'); }} required>{plans.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></div>
            <div><label>Modalidad</label><div className="input read-only">{plan?.modality === 'MEDIA_TECNICA' ? 'MEDIA TÉCNICA' : 'MEDIA GENERAL'}</div></div>
            <div><label>Mención *</label><select className="input" value={mentionId} onChange={(e) => setMentionId(e.target.value)} required><option value="">Seleccione</option>{activeMentions.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div><label>Grado a cursar *</label><select className="input" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>{Array.from({ length: plan?.maxGrade || 1 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g}° AÑO</option>)}</select></div>
            <div><label>Sección *</label><select className="input" value={sectionId} onChange={(e) => setSectionId(e.target.value)} required><option value="">Seleccione</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}{s.shift ? ` · ${s.shift}` : ''}</option>)}</select></div>
            <div><label>Fecha inscripción *</label><input className="input" name="registrationDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
            <div><label>Último año aprobado *</label><select className="input" name="lastApprovedYear" value={lastApprovedYear} onChange={(e) => setLastApprovedYear(e.target.value)}><option value="">Seleccione / Sin registro</option>{approvedYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}</select>{student?.enrollments?.[0]?.lastApprovedYear && <small className="field-hint">Se cargó el último año aprobado registrado en el expediente.</small>}</div>
            <div><label>Literal{grade === 1 ? ' *' : recordedLiteral ? ' · Registrado' : ' · No aplica'}</label><select className="input" name="literal" value={grade === 1 ? literal : (recordedLiteral || '')} onChange={(e) => setLiteral(e.target.value)} disabled={grade !== 1}><option value="">{grade === 1 ? 'Seleccione' : 'BLOQUEADO PARA 2° AÑO EN ADELANTE'}</option>{LITERALS.map((x) => <option key={x} value={x}>{x}</option>)}</select>{grade === 1 ? <small className="field-hint">Disponible únicamente para inscripción en 1° año.</small> : recordedLiteral ? <small className="field-hint">Literal de ingreso registrado en el expediente. Se muestra como referencia y no puede modificarse desde 2° año.</small> : <small className="field-hint">No existe literal de ingreso registrado. El campo permanece bloqueado desde 2° año.</small>}</div>
          </div>

          {gradeRegression && <div className="warning-banner academic-regression-warning"><div><strong>⚠ ALERTA: POSIBLE RETROCESO DE GRADO</strong><span>{recordedGrade !== null ? `El expediente más reciente registra al estudiante en ${recordedGrade}° AÑO. ` : ''}{lastApprovedNumber > 0 ? `Además, figura ${lastApprovedYear} como último año aprobado. ` : ''}Está seleccionando ${grade}° AÑO. Verifique que realmente se trate de una corrección de primera matrícula antes de guardar.</span></div></div>}
          {sections.length === 0 && <div className="warning-banner"><div><strong>No existen secciones para esta combinación.</strong><span>Configure primero una sección para el año, plan y grado.</span></div><Link className="btn secondary" href="/enrollments/configuration">Configurar</Link></div>}
        </section>

        <section className="card form-section">
          <div className="section-head"><div><h2>4. Condición académica de ingreso</h2><p>Solo aplica de forma manual a estudiantes provenientes de otro plantel. Para estudiantes de ETIMA, Reinscripción obtiene esta condición automáticamente desde Notas / Definitiva.</p></div><span className="step-pill">4</span></div>
          <div className="form-grid cols-3">
            <div><label>Procedencia académica</label><div className="input read-only">OTRO PLANTEL / PRIMER INGRESO A ETIMA</div></div>
            <div><label>Condición de ingreso *</label><select className="input" value={entryCondition} onChange={(e) => setEntryCondition(e.target.value)}><option value="REGULAR">REGULAR</option><option value="MATERIA_PENDIENTE">MATERIA PENDIENTE</option><option value="REPITIENTE">REPITIENTE</option></select></div>
            <div><label>Plantel de procedencia *</label><div className="input read-only">{student.originSchool || 'SIN REGISTRAR'}</div></div>
          </div>

          <div className={entryCondition === 'REGULAR' ? 'success-banner' : 'warning-banner'} style={{ marginTop: 16 }}>
            {entryCondition === 'REGULAR' ? <BookOpenCheck size={20} /> : <TriangleAlert size={20} />}
            <div><strong>{entryCondition.replaceAll('_', ' ')}</strong><span>{conditionDescription(entryCondition, grade)}</span></div>
          </div>

          {missingOriginSchool && <div className="warning-banner"><TriangleAlert size={20} /><div><strong>Debe registrar el plantel de procedencia.</strong><span>En una primera matrícula debe quedar identificado el plantel de procedencia, tanto para REGULAR como para MATERIA PENDIENTE o REPITIENTE.</span></div><Link className="btn secondary" href={`/students/${student.id}/edit`}>Actualizar ficha</Link></div>}

          {entryCondition !== 'REGULAR' && <>
            <div className="section-title" style={{ marginTop: 20 }}><div><h3>{entryCondition === 'MATERIA_PENDIENTE' ? (grade === 1 ? 'Materias pendientes provenientes de 6° GRADO' : `Materias pendientes de ${grade - 1}° AÑO`) : `Materias reprobadas de ${grade}° AÑO`}</h3><p className="muted">{entryCondition === 'MATERIA_PENDIENTE' ? (grade === 1 ? 'Registre exactamente 1 o 2 materias según la boleta o certificación del plantel de procedencia. Estas materias no se confunden con el plan 31059/41049.' : 'Seleccione 1 o 2. El sistema agregará estas materias al plan completo del nuevo grado.') : 'Seleccione más de 2. El estudiante cursará únicamente las materias seleccionadas.'}</p></div></div>
            {entryCondition === 'MATERIA_PENDIENTE' && grade === 1 ? (
              <div className="form-grid cols-2">
                <div><label>Materia pendiente 1 *</label><input className="input" value={manualPendingSubjectNames[0] || ''} maxLength={120} onChange={(e) => setManualPendingSubjectNames([e.target.value.toLocaleUpperCase('es-VE'), manualPendingSubjectNames[1] || ''])} placeholder="NOMBRE DE LA MATERIA" /></div>
                <div><label>Materia pendiente 2 (opcional)</label><input className="input" value={manualPendingSubjectNames[1] || ''} maxLength={120} onChange={(e) => setManualPendingSubjectNames([manualPendingSubjectNames[0] || '', e.target.value.toLocaleUpperCase('es-VE')])} placeholder="NOMBRE DE LA MATERIA" /></div>
                <div className="span-2 info-note">Origen académico: <strong>6° GRADO · OTRO PLANTEL</strong> · Registradas: <strong>{uniqueManualPendingNames.length}</strong> · permitido: 1 a 2.</div>
              </div>
            ) : <>
              {availableFailedSubjects.length === 0 ? <div className="warning-banner"><div><strong>No hay materias configuradas para seleccionar.</strong><span>Revise el plan de estudio y el grado correspondiente.</span></div></div> : <div className="curriculum-grid">{availableFailedSubjects.map((s: any) => {
                const checked = failedSubjectIds.includes(s.id);
                return <label className={`curriculum-card ${checked ? 'selected' : ''}`} key={s.id} style={{ cursor: 'pointer' }}><input type="checkbox" checked={checked} onChange={() => toggleFailedSubject(s.id)} /><BookOpenCheck size={18} /><div><strong>{s.subject?.name || 'MATERIA'}</strong><span>{s.gradeLevel}° AÑO · {checked ? 'SELECCIONADA' : 'SELECCIONAR'}</span></div></label>;
              })}</div>}
              <p className="info-note">Seleccionadas: <strong>{failedSubjectIds.length}</strong>{entryCondition === 'MATERIA_PENDIENTE' ? ' · permitido: 1 a 2' : ' · requerido: más de 2'}</p>
            </>}
          </>}
        </section>

        <section className="card form-section">
          <div className="section-head"><div><h2>5. Antropometría de ingreso</h2><p>Esta medición queda ligada al año escolar.</p></div><span className="step-pill">5</span></div>
          <div className="form-grid cols-3">
            <div className="inline-fields"><div><label>Metros *</label><input className="input" type="number" name="meters" min="0" max="2" defaultValue="1" required /></div><div><label>Centímetros *</label><input className="input" type="number" name="centimeters" min="0" max="99" defaultValue="50" required /></div></div>
            <div className="inline-fields"><div><label>Kilos *</label><input className="input" type="number" name="kg" min="10" max="300" required /></div><div><label>Gramos *</label><input className="input" type="number" name="grams" min="0" max="999" defaultValue="0" required /></div></div>
            <div><label>Zapatos</label><input className="input" type="number" name="shoeSize" min="20" max="46" /></div>
            <div><label>Camisa</label><select className="input" name="shirtSize">{GARMENTS.map((x) => <option key={x || 'none'} value={x}>{x || 'Seleccione'}</option>)}</select></div>
            <div><label>Pantalón</label><select className="input" name="pantSize">{GARMENTS.map((x) => <option key={x || 'none'} value={x}>{x || 'Seleccione'}</option>)}</select></div>
          </div>
        </section>

        <div className="info-banner"><strong>Control de formalización:</strong> al pulsar el botón, el sistema revisará estudiante, edad mínima, representante adulto, procedencia, año, plan, mención, grado, sección, último año aprobado, literal cuando corresponda, condición académica y antropometría. Si falta algún dato, mostrará el motivo y no guardará una matrícula incompleta.</div>
        <div className="action-bar"><Link className="btn secondary" href="/enrollments">Cancelar</Link><button className="btn" disabled={saving}><UserPlus size={17} />{saving ? 'Guardando…' : 'Formalizar matrícula'}</button></div>
      </form>}
    </Shell>
  );
}
