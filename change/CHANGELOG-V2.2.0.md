# SIGE-ETIMA V2.2.0 — Notas operativas

## Alcance
Se convierte el módulo de Notas de una pantalla informativa en un flujo operativo conectado a asignaciones docentes, matrícula y definitiva anual.

## Funciones incorporadas
- Selector de año escolar, asignación docente y lapso.
- Los usuarios DOCENTE solo pueden consultar/modificar sus propias asignaciones vinculadas a su ficha de Personal.
- Secretaría dispone de consulta sin edición.
- Configuración de política de evaluación por año para ADMIN/DIRECTOR: nota máxima, nota aprobatoria y rango de 2–5 evaluaciones por lapso.
- Creación, edición y eliminación segura de evaluaciones con título, técnica, instrumento, fecha/hora y ponderación.
- Transcripción masiva por nómina de Primera Forma.
- Segunda Forma habilitada únicamente cuando existe Primera Forma, el estudiante asistió y no aprobó.
- Inasistencia en Primera Forma no habilita Segunda Forma y se computa como 0 al cerrar el lapso.
- Cálculo ponderado de la definitiva del lapso para toda la nómina.
- Respeto de `EnrollmentSubject`: un repitiente solo aparece en las materias que realmente cursa.
- Resumen anual con los tres lapsos y promedio aritmético mostrado únicamente como sugerencia.
- Confirmación explícita de la definitiva anual; no se guarda automáticamente la sugerencia.
- Al completar todas las definitivas del estudiante, el backend recalcula automáticamente REGULAR / MATERIA PENDIENTE / REPITIENTE.
- Bloqueo de cambios cuando el año escolar está finalizado o la definitiva anual ya fue registrada.

## Regla pendiente de decisión institucional
La narrativa no define una fórmula anual única. Por eso V2.2.0 muestra el promedio simple de los lapsos como **sugerencia editable/confirmable**, sin imponerlo como definitiva automática. La institución podrá definir posteriormente una fórmula normativa específica.

## Base de datos
No requiere cambios Prisma.
