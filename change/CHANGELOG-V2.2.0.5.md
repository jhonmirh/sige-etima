# V2.2.0.5 — Bancos Venezuela + corrección cuenta bancaria

## Correcciones
- Corrige el patrón HTML del número de cuenta del Personal: una cuenta válida de 20 dígitos ya no es rechazada por el navegador.
- Representantes y Personal usan la misma regla: exactamente 20 dígitos numéricos, sin espacios ni guiones.
- Backend de Representantes valida también exactamente 20 dígitos.

## Catálogo bancario
- Reemplaza el banco de texto libre por un selector con bancos venezolanos y su código bancario.
- Conserva valores bancarios históricos no incluidos en el catálogo como opción `REGISTRADO` al editar.
- No requiere cambios de Prisma ni migraciones de base de datos.
