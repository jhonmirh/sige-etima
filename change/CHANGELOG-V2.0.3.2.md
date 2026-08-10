# SIGE-ETIMA V2.0.3.2

## Gestión del vínculo estudiante-representante
- Se agrega una pantalla específica **Modificar vínculo**.
- Permite corregir MADRE, PADRE, AUTORIZADO u OTRO sin duplicar estudiante ni representante.
- Permite modificar si es representante principal y si vive con el estudiante.
- AUTORIZADO y OTRO mantienen la descripción obligatoria.
- Al cambiar a MADRE o PADRE la descripción de autorización se limpia.
- Se agrega **Desvincular** con confirmación tanto desde la ficha del estudiante como desde la ficha del representante.
- La desvinculación elimina solo la relación; no elimina ninguna persona.

## Catálogo administrativo de nombres de secciones
- Nuevo modelo PostgreSQL `SectionName`.
- Solo el rol **ADMIN** puede agregar, renombrar, activar o inactivar nombres.
- ADMIN y DIRECTOR crean secciones seleccionando un nombre activo del catálogo.
- Los nombres ya usados en secciones existentes se importan automáticamente al catálogo en el seed.
- Inactivar o renombrar un nombre del catálogo no modifica el histórico de secciones/matrículas ya creadas.

## Compatibilidad
- Incluye la corrección V2.0.3.1 del tipado de `resultMap` en Matrícula/Reinscripción.
- No elimina ni reinicia la base de datos.
