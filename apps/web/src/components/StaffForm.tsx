'use client';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/api';
import {DIGITS_PATTERN,NAME_PATTERN,digitsOnlyInput,nameOnlyInput,toUpperInput} from '@/lib/formRules';

type Props={mode:'create'|'edit';staff?:any};
const UPPER=new Set([
  'firstName','middleName','lastName','secondLastName','address','birthPlace','cargoCode','cargoDescription','institutionalFunction','pantSize','shirtSize','bankName',
  'housingRepairDescription','diseaseDescription','surgeryDescription','eyeConditionDescription','continuousLeaveDisease','retirementProcessObservation','administrativeProcessObservation'
]);
const BOOL_FIELDS=['disability','medicalReport','housingRepairNeeded','hasDisease','needsSurgery','wearsGlasses'];
const GARMENTS=['','10','11','12','13','14','15','16','S','M','L','XL','2XL','3XL'];
const CONDITION_LABELS:Record<string,string>={
  ACTIVO:'ACTIVO',
  REPOSO_CONTINUO:'REPOSO CONTINUO',
  INCAPACITADO:'INCAPACITADO',
  JUBILADO:'JUBILADO',
  EN_PROCESO_JUBILACION:'EN PROCESO DE JUBILACIÓN',
  PROCESO_ADMINISTRATIVO:'PROCESO ADMINISTRATIVO',
};

function payload(form:HTMLFormElement){
  const fd=new FormData(form);const out:Record<string,any>={};
  fd.forEach((v,k)=>{if(typeof v==='string'){const t=v.trim();if(t!=='')out[k]=UPPER.has(k)?t.toLocaleUpperCase('es-VE'):t}});
  for(const k of BOOL_FIELDS)out[k]=fd.get(k)==='on';
  for(const k of ['shoeSize','continuousLeaveCount'])if(out[k]!==undefined)out[k]=Number(out[k]);
  return out;
}
function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function serviceYears(value:string){
  if(!value)return null;const start=new Date(`${value}T12:00:00`);if(Number.isNaN(start.getTime()))return null;const now=new Date();
  let years=now.getFullYear()-start.getFullYear();const anniversary=new Date(now.getFullYear(),start.getMonth(),start.getDate());if(now<anniversary)years--;return Math.max(0,years);
}
function cargoCodeInput(e:FormEvent<HTMLInputElement>){
  e.currentTarget.value=e.currentTarget.value.replace(/[^A-Za-z0-9]/g,'').toLocaleUpperCase('es-VE').slice(0,6);
}

export default function StaffForm({mode,staff}:Props){
  const router=useRouter();const [error,setError]=useState(''),[saving,setSaving]=useState(false);const d=staff||{};
  const [housing,setHousing]=useState(d.housingTenure||'');
  const [repair,setRepair]=useState(!!d.housingRepairNeeded);
  const [disease,setDisease]=useState(!!d.hasDisease);
  const [surgery,setSurgery]=useState(!!d.needsSurgery);
  const [glasses,setGlasses]=useState(!!d.wearsGlasses);
  const [staffType,setStaffType]=useState(d.staffType||'DOCENTE');
  const [condition,setCondition]=useState(d.employmentCondition||'ACTIVO');
  const [entryDate,setEntryDate]=useState(d.ministryEntryDate?String(d.ministryEntryDate).slice(0,10):'');
  const years=serviceYears(entryDate);

  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');try{const data=payload(e.currentTarget);const r:any=await api(mode==='create'?'/staff':`/staff/${d.id}`,{method:mode==='create'?'POST':'PATCH',body:JSON.stringify(data)});router.push(`/staff/${r.id||d.id}`)}catch(err:any){setError(err.message||'No fue posible guardar el personal')}finally{setSaving(false)}}
  const nameProps={pattern:NAME_PATTERN,title:'Solo se permiten letras, espacios, guiones y apóstrofes.',onInput:nameOnlyInput};const digitProps={inputMode:'numeric' as const,pattern:DIGITS_PATTERN,onInput:digitsOnlyInput};
  return <form className="stack" onSubmit={submit}>{error&&<div className="alert">{error}</div>}
    <section className="card form-section"><div className="section-head"><div><h2>Identificación y clasificación</h2><p>Registre los datos personales básicos del trabajador.</p></div><span className="step-pill">01</span></div><div className="form-grid cols-3">
      <div><label>Tipo de personal *</label><select className="input" name="staffType" value={staffType} required onChange={e=>setStaffType(e.target.value)}><option value="DOCENTE">DOCENTE</option><option value="ADMINISTRATIVO">ADMINISTRATIVO</option><option value="OBRERO">OBRERO</option><option value="COCINERO">COCINERA(O)</option></select></div>
      <div><label>Nacionalidad *</label><select className="input" name="nationality" defaultValue={d.nationality||'VENEZOLANO'} required><option value="VENEZOLANO">V</option><option value="EXTRANJERO">E</option></select></div>
      <div><label>Cédula *</label><input className="input" name="identityNumber" defaultValue={d.identityNumber||''} required maxLength={12} {...digitProps}/></div>
      <div><label>Primer nombre *</label><input className="input uppercase" name="firstName" defaultValue={d.firstName||''} required {...nameProps}/></div>
      <div><label>Segundo nombre</label><input className="input uppercase" name="middleName" defaultValue={d.middleName||''} {...nameProps}/></div>
      <div><label>Primer apellido *</label><input className="input uppercase" name="lastName" defaultValue={d.lastName||''} required {...nameProps}/></div>
      <div><label>Segundo apellido</label><input className="input uppercase" name="secondLastName" defaultValue={d.secondLastName||''} {...nameProps}/></div>
      <div><label>Estado civil</label><select className="input" name="maritalStatus" defaultValue={d.maritalStatus||''}><option value="">NO INDICADO</option><option value="SOLTERO">SOLTERO(A)</option><option value="CASADO">CASADO(A)</option><option value="VIUDO">VIUDO(A)</option><option value="DIVORCIADO">DIVORCIADO(A)</option><option value="UNION_ESTABLE">UNIÓN ESTABLE</option></select></div>
      <div><label>Sexo</label><select className="input" name="sex" defaultValue={d.sex||''}><option value="">NO INDICADO</option><option value="MASCULINO">MASCULINO</option><option value="FEMENINO">FEMENINO</option></select></div>
      <div><label>Fecha de nacimiento</label><input className="input" type="date" name="birthDate" defaultValue={d.birthDate?String(d.birthDate).slice(0,10):''}/></div>
      <div><label>Lugar de nacimiento</label><input className="input uppercase" name="birthPlace" defaultValue={d.birthPlace||''} onInput={toUpperInput}/></div>
      <div><label>Tipo de sangre</label><select className="input" name="bloodType" defaultValue={d.bloodType||''}><option value="">NO INDICADO</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
      <div className="span-3"><label>Dirección *</label><textarea className="input textarea uppercase" name="address" defaultValue={d.address||''} onInput={toUpperInput} required/></div>
      <div><label>Teléfono</label><input className="input" name="phone" defaultValue={d.phone||''} maxLength={15} {...digitProps}/></div><div><label>Correo electrónico</label><input className="input" type="email" name="email" defaultValue={d.email||''}/></div>
    </div></section>

    <section className="card form-section"><div className="section-head"><div><h2>Vivienda y salud</h2><p>Condiciones habitacionales y datos de salud declarados por el personal.</p></div><span className="step-pill">02</span></div><div className="form-grid cols-3">
      <div><label>Vivienda</label><select className="input" name="housingTenure" value={housing} onChange={e=>{setHousing(e.target.value);if(e.target.value!=='PROPIA')setRepair(false)}}><option value="">NO INDICADO</option><option value="PROPIA">PROPIA</option><option value="ALQUILADA">ALQUILADA</option><option value="PRESTADA">PRESTADA</option></select></div>
      {housing==='PROPIA'&&<label className="check-card"><input type="checkbox" name="housingRepairNeeded" checked={repair} onChange={e=>setRepair(e.target.checked)}/><span><strong>¿Necesita arreglo?</strong><small>Marque si la vivienda propia requiere reparación.</small></span></label>}
      {housing==='PROPIA'&&repair&&<div className="span-3"><label>¿Qué tipo de arreglo necesita? *</label><textarea className="input textarea uppercase" name="housingRepairDescription" defaultValue={d.housingRepairDescription||''} onInput={toUpperInput} required/></div>}
      <label className="check-card"><input type="checkbox" name="hasDisease" checked={disease} onChange={e=>setDisease(e.target.checked)}/><span><strong>¿Padece alguna enfermedad?</strong><small>Si responde sí, debe describirla.</small></span></label>
      {disease&&<div className="span-2"><label>Descripción de la enfermedad *</label><textarea className="input textarea uppercase" name="diseaseDescription" defaultValue={d.diseaseDescription||''} onInput={toUpperInput} required/></div>}
      <label className="check-card"><input type="checkbox" name="needsSurgery" checked={surgery} onChange={e=>setSurgery(e.target.checked)}/><span><strong>¿Amerita alguna operación?</strong><small>Indique cuál si corresponde.</small></span></label>
      {surgery&&<div className="span-2"><label>Operación que amerita *</label><textarea className="input textarea uppercase" name="surgeryDescription" defaultValue={d.surgeryDescription||''} onInput={toUpperInput} required/></div>}
      <label className="check-card"><input type="checkbox" name="wearsGlasses" checked={glasses} onChange={e=>setGlasses(e.target.checked)}/><span><strong>¿Usa lentes?</strong><small>Registre la condición visual cuando corresponda.</small></span></label>
      {glasses&&<div className="span-2"><label>Condición o enfermedad visual *</label><textarea className="input textarea uppercase" name="eyeConditionDescription" defaultValue={d.eyeConditionDescription||''} onInput={toUpperInput} required/></div>}
      <label className="check-card"><input type="checkbox" name="disability" defaultChecked={!!d.disability}/><span><strong>Posee discapacidad</strong><small>Marque cuando corresponda.</small></span></label>
      <label className="check-card"><input type="checkbox" name="medicalReport" defaultChecked={!!d.medicalReport}/><span><strong>Informe médico</strong><small>Indica si existe soporte médico.</small></span></label>
    </div></section>

    <section className="card form-section"><div className="section-head"><div><h2>Datos laborales</h2><p>Todos los datos laborales son obligatorios. El código y la descripción del cargo se registran manualmente según la codificación oficial correspondiente.</p></div><span className="step-pill">03</span></div><div className="form-grid cols-3">
      <div><label>Código de cargo *</label><input className="input uppercase" name="cargoCode" defaultValue={d.cargoCode||''} maxLength={6} pattern="[A-Za-z0-9]{1,6}" title="Solo letras y números, máximo 6 caracteres" onInput={cargoCodeInput} required/><small className="field-help">Solo letras y números · máximo 6 caracteres.</small></div>
      <div><label>Descripción del cargo *</label><input className="input uppercase" name="cargoDescription" defaultValue={d.cargoDescription||''} onInput={toUpperInput} required/></div>
      <div><label>Función dentro de la institución *</label><input className="input uppercase" name="institutionalFunction" defaultValue={d.institutionalFunction||''} onInput={toUpperInput} required/></div>
      <div><label>Fecha de ingreso al MPPE *</label><input className="input" type="date" name="ministryEntryDate" value={entryDate} max={localToday()} onChange={e=>setEntryDate(e.target.value)} required/></div>
      <div><label>Años de servicio</label><input className="input" value={years===null?'SE CALCULA CON LA FECHA DE INGRESO':`${years} AÑO${years===1?'':'S'}`} readOnly/></div>
      <div><label>Condición laboral *</label><select className="input" name="employmentCondition" value={condition} onChange={e=>setCondition(e.target.value)} required>{Object.entries(CONDITION_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>

      {condition==='REPOSO_CONTINUO'&&<><div className="span-2"><label>Enfermedad que origina el reposo continuo *</label><textarea className="input textarea uppercase" name="continuousLeaveDisease" defaultValue={d.continuousLeaveDisease||''} onInput={toUpperInput} required/></div><div><label>Cantidad de reposos *</label><input className="input" type="number" name="continuousLeaveCount" defaultValue={d.continuousLeaveCount||''} min={1} max={999} required/></div></>}
      {condition==='INCAPACITADO'&&<><div><label>Ente ejecutor *</label><select className="input" name="incapacityExecutor" defaultValue={d.incapacityExecutor||''} required><option value="">SELECCIONE</option><option value="IPASME">IPASME</option><option value="IVSS">IVSS</option></select></div><div><label>Fecha de incapacidad *</label><input className="input" type="date" name="incapacityDate" defaultValue={d.incapacityDate?String(d.incapacityDate).slice(0,10):''} max={localToday()} required/></div></>}
      {condition==='JUBILADO'&&<div><label>Fecha de jubilación *</label><input className="input" type="date" name="retirementDate" defaultValue={d.retirementDate?String(d.retirementDate).slice(0,10):''} max={localToday()} required/></div>}
      {condition==='EN_PROCESO_JUBILACION'&&<><div><label>Fecha de introducción del proceso *</label><input className="input" type="date" name="retirementProcessDate" defaultValue={d.retirementProcessDate?String(d.retirementProcessDate).slice(0,10):''} max={localToday()} required/></div><div className="span-2"><label>Observación del proceso de jubilación *</label><textarea className="input textarea uppercase" name="retirementProcessObservation" defaultValue={d.retirementProcessObservation||''} onInput={toUpperInput} required/></div></>}
      {condition==='PROCESO_ADMINISTRATIVO'&&<><div><label>Fecha del proceso administrativo *</label><input className="input" type="date" name="administrativeProcessDate" defaultValue={d.administrativeProcessDate?String(d.administrativeProcessDate).slice(0,10):''} max={localToday()} required/></div><div className="span-2"><label>Observación del proceso administrativo *</label><textarea className="input textarea uppercase" name="administrativeProcessObservation" defaultValue={d.administrativeProcessObservation||''} onInput={toUpperInput} required/></div></>}
    </div></section>

    <section className="card form-section"><div className="section-head"><div><h2>Tallas y datos bancarios</h2><p>Las tallas se seleccionan del mismo catálogo utilizado para estudiantes. La cuenta bancaria admite exactamente 20 dígitos.</p></div><span className="step-pill">04</span></div><div className="form-grid cols-3">
      <div><label>Talla de pantalón</label><select className="input" name="pantSize" defaultValue={d.pantSize||''}>{GARMENTS.map(x=><option key={x||'none'} value={x}>{x||'SELECCIONE'}</option>)}</select></div>
      <div><label>Talla de camisa</label><select className="input" name="shirtSize" defaultValue={d.shirtSize||''}>{GARMENTS.map(x=><option key={x||'none'} value={x}>{x||'SELECCIONE'}</option>)}</select></div>
      <div><label>Talla de zapatos</label><input className="input" type="number" name="shoeSize" min="20" max="50" defaultValue={d.shoeSize||''}/></div>
      <div><label>Banco</label><input className="input uppercase" name="bankName" defaultValue={d.bankName||''} onInput={toUpperInput}/></div>
      <div><label>Tipo de cuenta</label><select className="input" name="accountType" defaultValue={d.accountType||''}><option value="">NO INDICADO</option><option value="CORRIENTE">CORRIENTE</option><option value="AHORRO">AHORRO</option><option value="OTRA">OTRA</option></select></div>
      <div><label>Número de cuenta</label><input className="input" name="accountNumber" defaultValue={d.accountNumber||''} inputMode="numeric" pattern="\\d{20}" minLength={20} maxLength={20} title="Debe contener exactamente 20 dígitos numéricos" onInput={digitsOnlyInput}/><small className="field-help">20 dígitos numéricos.</small></div>
    </div></section>
    <div className="info-banner">Los hijos y su información educativa/salud se gestionan desde la ficha del personal después de guardar este registro.</div>
    <div className="action-bar"><button type="button" className="btn secondary" onClick={()=>router.back()}>Cancelar</button><button className="btn" disabled={saving}>{saving?'Guardando…':mode==='create'?'Registrar personal':'Guardar cambios'}</button></div>
  </form>
}
