# Reglas de negocio implementadas

## Matrícula y nómina
- Un estudiante solo puede tener una matrícula por año escolar.
- La sección se valida contra año escolar, plan y grado.
- Antes del cierre de matrícula, la nómina puede numerarse por cédula.
- Después del cierre, una nueva inscripción se agrega al final y nunca desplaza números anteriores.
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
