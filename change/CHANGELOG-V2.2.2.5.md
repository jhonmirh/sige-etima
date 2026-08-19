# SIGE-ETIMA V2.2.2.5 — Edición real de evaluaciones + objetivos únicos

## Corrección de edición de evaluaciones
- Se corrigió el caso en que al editar una evaluación existente el sistema parecía aceptar los cambios pero no los almacenaba.
- La causa era que evaluaciones antiguas podían conservar fechas u horas creadas antes de las reglas actuales; al modificar objetivo, contenido, técnica o instrumento, el sistema volvía a validar esa fecha histórica y bloqueaba toda la actualización.
- Si la fecha/hora NO se modifica, ahora se conserva exactamente y no se somete otra vez a las reglas nuevas.
- Si la fecha/hora SÍ se modifica, se validan días hábiles, horario 07:00–18:00 y orden cronológico.
- El ADMINISTRADOR puede corregir los datos de evaluaciones existentes aunque el lapso esté inactivo, siempre que el año académico permanezca abierto.
- El DOCENTE solo puede modificar evaluaciones cuando el lapso esté activo.

## Objetivos no repetidos
- La validación continúa protegida también en el backend.
- Un objetivo no puede repetirse en otra evaluación de la misma asignación docente durante el año escolar, incluso si pertenece a otro lapso.
- En el formulario la duplicidad se detecta inmediatamente: el campo se marca como inválido, aparece un mensaje visible y el botón Guardar queda bloqueado hasta usar un objetivo diferente.
- El sistema considera equivalentes valores numéricos como 1.1 y 1.10.

## Seguridad e histórico
- Crear evaluaciones nuevas sigue requiriendo lapso activo.
- Cargar notas y calcular definitivas sigue requiriendo lapso activo.
- Un año académico cerrado mantiene protegidas sus evaluaciones.
- No hay cambios de Prisma ni PostgreSQL.
