# Reglas de negocio implementadas

## Matrícula y nómina
- Un estudiante solo puede tener una matrícula por año escolar.
- La sección se valida contra año escolar, plan y grado.
- El cierre de matrícula es automático y permanente: 31 de octubre del año en que inicia cada período escolar.
- Antes del 31 de octubre, la nómina es provisional y se ordena numéricamente por cédula.
- Desde el 31 de octubre inclusive, la nómina queda fija automáticamente y una nueva inscripción o reinscripción se agrega al final sin desplazar números anteriores.
- Un retiro no elimina al estudiante ni libera su número de lista.

## Retiros
- Dentro de los primeros 30 días desde el inicio del año: `RETIRADO`.
- Después de los primeros 30 días: `RETIRADO_MODIFICADO`.
- Se conserva fecha, motivo y plantel de destino.

## Condición académica
- 0 materias reprobadas: Regular.
- Hasta 2: Materia Pendiente.
- Más de 2: Repitiente.
- Graduado e Inactivo son transiciones administrativas controladas.

## Evaluación
- Tres lapsos por año.
- Entre 2 y 5 evaluaciones por lapso.
- Cada evaluación puede tener primera y segunda forma.
- Si el estudiante está inasistente en la primera forma, no se habilita segunda forma.
- La segunda forma solo procede cuando la primera existe y no fue aprobada.
- Técnica, instrumento, fecha/hora y ponderación quedan registrados.

## Materia pendiente
Modelo preparado para cuatro oportunidades (Octubre, Diciembre, Febrero, Marzo), cada una con primera/segunda forma, y revisión final con dos formas. La fecha exacta se guarda en cada oportunidad.

## Orientación y Convivencia — Media General
Conversión automática de la nota cuantitativa anual:
- 18–20: A
- 16–17: B
- 12–15: C
- resto: D

## Regla pendiente de validación institucional
La narrativa no fija una fórmula matemática única para promediar las 2–5 evaluaciones de un lapso, ni declara expresamente el umbral general de aprobación. La implementación usa ponderaciones configurables y un umbral inicial 10/20, ambos modificables por año escolar.

## Regla cerrada V2.0.3 — promoción y reinscripción
- 0 materias reprobadas: REGULAR, promoción al siguiente grado, plan completo del nuevo grado.
- Hasta 2 reprobadas: MATERIA PENDIENTE, promoción al siguiente grado, plan completo nuevo + pendientes del año anterior.
- Más de 2 reprobadas: REPITIENTE, permanece en el mismo grado y cursa únicamente las materias reprobadas.
- La fuente de esta condición es la Definitiva Anual del módulo de Notas.
- Secretaría no puede modificar ordinariamente la condición calculada; solo ADMIN/DIRECTOR disponen de corrección excepcional auditada.
- El número de lista se fija automáticamente el 31 de octubre. Retiros y altas posteriores no renumeran estudiantes existentes.

### Menciones de Educación Media Técnica
- Toda sección vinculada a un plan `MEDIA_TECNICA` debe tener una mención activa.
- Las secciones de `MEDIA_GENERAL` no usan mención.
- La continuidad académica conserva la misma mención entre años escolares; cualquier cambio de mención debe gestionarse como excepción administrativa y no como reinscripción ordinaria.
- La numeración de nómina es propia de cada sección; al estar cada sección técnica asociada a una mención, las nóminas permanecen separadas por año, grado, mención y sección.
