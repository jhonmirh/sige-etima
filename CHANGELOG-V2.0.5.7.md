# SIGE-ETIMA V2.0.5.7 — Materia Pendiente desde 6° grado

## Corrección funcional
Se habilita **MATERIA PENDIENTE** para estudiantes provenientes de otro plantel que ingresan a **1° AÑO**.

### Ingreso a 1° AÑO con MATERIA PENDIENTE
- El usuario autorizado puede registrar manualmente **1 o 2 materias pendientes provenientes de 6° GRADO**.
- Los nombres se almacenan en MAYÚSCULAS y no pueden repetirse.
- Estas materias quedan identificadas como externas, con origen `6° GRADO`, sin mezclarlas artificialmente con las asignaturas de los planes 31059 o 41049.
- Se crean las cuatro oportunidades: OCTUBRE, DICIEMBRE, FEBRERO y MARZO.
- El estudiante cursa además el plan completo de 1° AÑO.

### Ingreso a 2° AÑO o superior con MATERIA PENDIENTE
- Continúa la regla existente: seleccionar 1 o 2 materias del año inmediatamente anterior dentro del mismo plan de estudio.

### Representantes
- Se mantiene el comportamiento correcto: un representante ya vinculado aparece visible como `YA VINCULADO`, pero no puede seleccionarse nuevamente para evitar duplicar la relación.

## Base de datos
Se amplía `PendingSubject` para admitir materias pendientes externas sin `StudyPlanSubject`:
- `studyPlanSubjectId` pasa a ser opcional.
- `manualSubjectName` permite almacenar el nombre certificado por el plantel de procedencia.
- `sourceLevel` registra el nivel de origen, por ejemplo `6° GRADO`.

El cambio es compatible con registros existentes y no elimina datos.
