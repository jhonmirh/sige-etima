# SIGE-ETIMA V2.0.5 — Condición académica en primera matrícula

## Objetivo
Separar definitivamente dos flujos académicos:

1. **Estudiante de ETIMA / Reinscripción:** la condición académica se calcula automáticamente desde Notas / Definitiva.
2. **Estudiante proveniente de otro plantel / Primera matrícula:** el usuario autorizado registra manualmente la condición de ingreso según los documentos académicos presentados.

## Reglas implementadas

### Primera matrícula — otro plantel
Condiciones permitidas:
- REGULAR
- MATERIA PENDIENTE
- REPITIENTE

#### REGULAR
- No admite materias reprobadas seleccionadas.
- Cursa todas las materias del grado seleccionado.

#### MATERIA PENDIENTE
- Disponible desde 2° año en adelante.
- Requiere seleccionar 1 o 2 materias del año inmediatamente anterior.
- Cursa todas las materias del nuevo grado + las materias pendientes seleccionadas.
- Se crean automáticamente las oportunidades OCTUBRE, DICIEMBRE, FEBRERO y MARZO.
- Requiere Plantel de procedencia registrado en la ficha del estudiante.

#### REPITIENTE
- Requiere seleccionar más de 2 materias reprobadas.
- Las materias deben pertenecer al mismo grado que el estudiante cursará nuevamente.
- El estudiante cursa únicamente las materias seleccionadas.
- Requiere Plantel de procedencia registrado en la ficha del estudiante.

### Reinscripción — estudiante de ETIMA
- La Primera matrícula queda bloqueada si el estudiante ya posee historial de matrícula en ETIMA.
- Debe utilizarse Reinscripción.
- REGULAR / MATERIA PENDIENTE / REPITIENTE siguen siendo determinadas automáticamente por las definitivas del año anterior.
- Secretaría no puede escoger manualmente la condición en ese flujo.

## Trazabilidad visual
La ficha de matrícula indica si:
- corresponde a una Primera matrícula desde otro plantel con condición manual; o
- procede de una matrícula anterior de ETIMA con decisión automática por definitiva.

## Base de datos
No hay cambios en `schema.prisma`.
No requiere migración ni `prisma db push` adicional.
