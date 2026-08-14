# SIGE-ETIMA V2.1.2 — Validación laboral, cuenta bancaria y catálogo de cargos

## Personal
- La cuenta bancaria se valida con exactamente 20 dígitos numéricos, tanto en frontend como en API.
- Talla de camisa y pantalón pasan a selectores con el mismo catálogo utilizado por Estudiantes: 10–16, S, M, L, XL, 2XL y 3XL.
- Los datos laborales son obligatorios: código de cargo, descripción, función institucional y fecha de ingreso al MPPE.
- La fecha de ingreso al MPPE no puede ser futura.
- Los años de servicio se calculan automáticamente a partir de la fecha de ingreso al MPPE y se muestran en formulario, listado y ficha.

## Catálogo institucional de cargos
- Nuevo `StaffPositionCatalog` clasificado por DOCENTE / ADMINISTRATIVO / OBRERO.
- El formulario de Personal filtra los códigos de cargo según el tipo de personal seleccionado.
- La descripción del cargo se obtiene automáticamente del catálogo y queda bloqueada para evitar inconsistencias.
- El Administrador puede agregar y activar/inactivar códigos desde Personal.
- El seed incorpora los códigos que ya estén siendo utilizados por personal existente para preservar compatibilidad.
- Se incluyen tres códigos institucionales base (DOC, ADM y OBR) como punto de partida editable; no sustituyen los códigos que la institución decida registrar en su catálogo.

## Compatibilidad
- Cambio Prisma aditivo: agrega la tabla `StaffPositionCatalog`.
- No elimina ni modifica matrículas, estudiantes, representantes, notas ni hijos del personal.
