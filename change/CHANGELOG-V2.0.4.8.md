# SIGE-ETIMA V2.0.4.8 — 6° grado en último año aprobado

- Se agrega **6° GRADO** al selector de “Último año aprobado” para ambas modalidades:
  - Plan 31059 / Media General: 6° GRADO, 1° AÑO, 2° AÑO, 3° AÑO, 4° AÑO.
  - Plan 41049 / Media Técnica: 6° GRADO, 1° AÑO, 2° AÑO, 3° AÑO, 4° AÑO, 5° AÑO.
- El backend acepta y valida 6° GRADO para ambos planes.
- Se corrige la alerta de retroceso académico para que **6° GRADO no sea interpretado como 6° AÑO**. Seleccionar 1° AÑO después de 6° GRADO es una progresión normal y no genera alerta.
- No hay cambios en Prisma ni migraciones de base de datos.
