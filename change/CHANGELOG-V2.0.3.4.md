# SIGE-ETIMA V2.0.3.4

## Cierre automático de matrícula

Se cierra como regla institucional permanente que la fecha de cierre de matrícula será siempre el **31 de octubre del año calendario en que comienza el período escolar**.

Ejemplos:
- 2026-2027 → 31/10/2026
- 2027-2028 → 31/10/2027
- 2028-2029 → 31/10/2028

### Backend
- El API ya no acepta una fecha de cierre manual al crear el año escolar.
- `AcademicService.createYear` calcula automáticamente el 31 de octubre a partir de `startDate`.
- Los períodos creados en versiones anteriores son normalizados automáticamente al consultar los años escolares.
- La lógica de matrícula/reinscripción calcula el cierre directamente desde el inicio del período, incluso si el valor almacenado proviniera de una versión antigua.
- Desde el 31 de octubre inclusive, las nóminas pendientes de fijar se materializan automáticamente al consultar las secciones o la matrícula.
- Se conserva el endpoint administrativo de fijación como respaldo técnico, pero la interfaz ya no requiere ni muestra una acción manual.
- Se incorporó manejo explícito de fecha institucional en `America/Caracas` para que el cambio ocurra al comenzar el 31 de octubre en Venezuela.

### Numeración
- Antes del 31 de octubre: `NÓMINA PROVISIONAL`, orden numérico por cédula.
- Desde el 31 de octubre inclusive: `NÓMINA FIJA` automática.
- Inscripciones/reinscripciones posteriores: siguiente número disponible al final, por fecha de registro.
- Los números ya ocupados nunca se reutilizan ni se desplazan.

### Frontend
- Se eliminó el campo editable de fecha de cierre.
- Se muestra `31/10/AAAA · AUTOMÁTICO` calculado al seleccionar la fecha de inicio.
- Se agregó aviso permanente sobre la regla institucional.
- Se eliminó el botón `Fijar nómina` de la configuración normal.
- El aviso de matrícula cambia automáticamente entre `NÓMINA PROVISIONAL · CIERRE AUTOMÁTICO` y `NÓMINA FIJA AUTOMÁTICAMENTE`.

### Base de datos
- No hay cambios de esquema Prisma.
- No se eliminan ni reinician datos.
- Al consultar los años escolares, el sistema normaliza el campo `enrollmentCloseDate` existente al 31 de octubre correspondiente.
