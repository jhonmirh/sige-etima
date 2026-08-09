# SIGE-ETIMA V2.0.4.6 — Último año aprobado y literal de ingreso

## Primera matrícula

- **Último año aprobado** deja de ser texto libre y pasa a ser un selector controlado.
- Si el estudiante ya posee un valor registrado en su matrícula más reciente, se precarga automáticamente.
- Para el plan **31059 · Bachiller / Media General**, las opciones permitidas son:
  - 1° AÑO
  - 2° AÑO
  - 3° AÑO
  - 4° AÑO
- Para el plan **41049 · Técnicos Profesionales / Media Técnica**, las opciones permitidas son:
  - 1° AÑO
  - 2° AÑO
  - 3° AÑO
  - 4° AÑO
  - 5° AÑO
- Si no existe un último año aprobado registrado, el selector permanece vacío con la opción `Seleccione / Sin registro`.

## Literal

- El campo **Literal** deja de ser texto libre.
- En inscripción a **1° AÑO** se habilita un selector con las opciones: `A`, `B`, `C`, `D`.
- Desde **2° AÑO en adelante**, el campo queda bloqueado y no se envía ni guarda ningún literal.
- El backend valida que un literal solo pueda ser A/B/C/D y que no pueda registrarse en grados superiores a 1° año.

## Seguridad de datos

- El backend valida que `lastApprovedYear` corresponda al catálogo permitido para los planes 31059 y 41049.
- No hay cambios en Prisma ni en la estructura de PostgreSQL.
