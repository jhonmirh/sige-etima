# SIGE-ETIMA V2.0.7.5 — Eliminación segura de planes manuales

## Regla nueva
- Los planes oficiales precargados (`officialCatalog=true`) **nunca se eliminan**. Solo pueden activarse o inactivarse.
- Los planes incorporados manualmente (`officialCatalog=false`) pueden eliminarse definitivamente **solo si todavía no tienen secciones ni matrículas**.
- Si un plan manual ya tiene uso académico, se protege el histórico y solo puede inactivarse.

## Backend
- Nuevo endpoint ADMIN: `DELETE /api/academic/plans/:id`.
- Valida que el plan no pertenezca al catálogo nacional.
- Valida que no tenga secciones ni matrículas.
- Elimina el plan, sus menciones y relaciones de malla sin uso.
- Limpia materias huérfanas creadas exclusivamente para ese plan.

## Frontend
- El detalle de un plan manual sin uso muestra `Eliminar plan creado`.
- Confirmación explícita antes de eliminar.
- Los planes oficiales nunca muestran la acción Eliminar.
- Los planes manuales con histórico muestran el motivo por el que no pueden borrarse.

## Base de datos
- No modifica el esquema Prisma.
- No requiere migración.
