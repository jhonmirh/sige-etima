# SIGE-ETIMA V2.0.4.4 — Catálogo fijo de turnos

## Cambio funcional
- El campo **Turno** al crear una sección dejó de ser texto libre.
- Ahora es obligatorio seleccionar una de estas opciones institucionales:
  - INTEGRAL
  - MEDIO DÍA MAÑANA
  - MEDIO DÍA TARDE
- El backend valida la misma lista para impedir valores distintos mediante llamadas directas a la API.
- No se modifica el esquema Prisma ni los datos históricos.
