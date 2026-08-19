# SIGE-ETIMA V2.2.2.8 — Persistencia real del calendario de lapsos

- Corrige el caso en el que el ADMIN modificaba Desde/Hasta y parecía guardar, pero luego reaparecían las fechas anteriores.
- Se eliminó la regla antigua que impedía persistir el nuevo calendario si ya existían evaluaciones fuera del rango.
- El calendario oficial definido por el ADMIN ahora se guarda primero como fuente de verdad.
- Si evaluaciones históricas quedan fuera del nuevo período, el sistema informa cuáles requieren corrección, pero no revierte las fechas oficiales.
- El cierre de lapso queda bloqueado mientras existan evaluaciones fuera de las fechas vigentes.
- El frontend actualiza inmediatamente las fechas persistidas y restaura las reales si el API rechaza un cambio.
- Los errores al guardar fechas ahora muestran aviso temporal visible; no queda un borrador en pantalla simulando que fue guardado.
- El calendario de Nueva/Editar evaluación toma min/max directamente de las fechas vigentes devueltas por el backend.
- Debajo de Fecha y hora se muestra explícitamente el período vigente del lapso.
- No hay cambios en Prisma ni en la estructura de PostgreSQL.
