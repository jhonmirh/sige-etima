# SIGE-ETIMA V2.2.2.8 — Persistencia de fechas de lapsos

- Corrige la regresión visual de fechas de lapsos después de crear/editar una evaluación.
- La respuesta persistida por PostgreSQL pasa a ser la fuente inmediata de verdad del frontend.
- Cada carga del workspace sincroniza el lapso devuelto por el API con las tarjetas y el selector.
- Guardar fechas ya no depende de una recarga completa del contexto para reflejar el cambio.
- El campo Fecha y hora de Nueva evaluación usa min/max basados en las fechas actuales administradas del lapso.
- No hay cambios en Prisma ni en la estructura de PostgreSQL.
