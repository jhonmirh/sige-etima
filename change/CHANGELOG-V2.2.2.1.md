# SIGE-ETIMA V2.2.2.1 — Hotfix Prisma Objetivos

- Elimina la restricción UNIQUE de base de datos `Assessment(teacherAssignmentId, objective)` que hacía que `prisma db push` se detuviera solicitando `--accept-data-loss`.
- Se conserva la regla funcional de que un objetivo no puede repetirse para la misma materia/asignación durante el año escolar.
- La unicidad sigue validándose explícitamente en el servicio de Notas antes de crear o editar una evaluación.
- No elimina datos existentes ni requiere `--accept-data-loss`.
