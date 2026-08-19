# SIGE-ETIMA V2.2.2.6 — Hotfix activación de lapsos

- Corrige el caso en que ADMIN desactivaba el 1.er lapso y activaba el 2.º, pero la pantalla seguía trabajando sobre el lapso anterior y bloqueaba "Agregar evaluación".
- Al activar un lapso, el frontend lo selecciona automáticamente como lapso de trabajo y recarga el workspace correspondiente.
- Al activar un lapso, el backend garantiza que sea el único lapso OPEN del año escolar. Otros lapsos OPEN pasan a PLANNED; los CLOSED no se modifican.
- Se muestra confirmación explícita: "Lapso N activado y seleccionado para trabajar. Ya puede registrar evaluaciones."
- No hay cambios de Prisma ni de estructura de PostgreSQL.
