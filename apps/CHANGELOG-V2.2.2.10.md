# SIGE-ETIMA V2.2.2.10 — Guardado independiente de inasistencias

Corrección funcional sobre V2.2.2.9 en **Notas → Definitiva del lapso**.

## Cambios

- Se agrega el botón independiente **Guardar inasistencias** junto al botón **Calcular definitiva del lapso**.
- El guardado de inasistencias ya no depende del cálculo de la definitiva.
- Después de un guardado exitoso se muestra:
  - alerta verde dentro de la sección;
  - notificación global de éxito.
- Si existen cambios de inasistencias todavía no guardados, el sistema evita calcular la definitiva y solicita primero usar **Guardar inasistencias** para impedir pérdida silenciosa de datos.
- El campo sigue siendo opcional. Vacío significa **sin inasistencias registradas**.
- Solo admite enteros positivos **1, 2, 3...**. Se rechazan 0, negativos, decimales, letras y símbolos.
- Las inasistencias se mantienen separadas por **estudiante + materia + lapso**.
- Se incorpora el endpoint dedicado `POST /grading/assignments/:assignmentId/lapses/:lapseId/absences`.
- El backend vuelve a validar cada valor aunque la interfaz ya lo haya validado.
- Se registra auditoría `GUARDAR_INASISTENCIAS_LAPSO` cuando realmente cambia algún valor.
- Guardar inasistencias antes de calcular una definitiva puede crear un `LapseGrade` con `score = null`; por ello se corrige la regla que detecta un lapso ya calculado para que solo considere registros con `score` o `closedAt`, evitando bloquear indebidamente la edición/eliminación de evaluaciones por el mero hecho de haber guardado asistencia.

## Políticas respetadas

- **ADMIN** y el **DOCENTE responsable** pueden registrar/modificar inasistencias.
- **DIRECTOR** y **SECRETARÍA** permanecen en modo consulta para este dato dentro de Notas.
- El lapso debe estar **ACTIVO** para registrar o modificar inasistencias.
- El año escolar debe permanecer académicamente abierto.
- No se permiten cambios si la definitiva anual de la materia ya fue consolidada.
- No se modifica la política de escala de notas, nota mínima aprobatoria, cantidad de evaluaciones ni fórmula de la definitiva.

## Compatibilidad

El parche es acumulativo sobre V2.2.2.8/V2.2.2.9 e incluye nuevamente el campo Prisma `LapseGrade.absences Int?` introducido en V2.2.2.9.
