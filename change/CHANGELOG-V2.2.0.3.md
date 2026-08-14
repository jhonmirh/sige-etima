# SIGE-ETIMA V2.2.0.3 — Personal: Cocineras(os)

## Cambios
- Se agrega `COCINERO` al enum `StaffType` de Prisma.
- En la interfaz se muestra como **COCINERA(O)**.
- Nuevo tipo disponible al crear/editar personal.
- Nuevo filtro **COCINERAS(OS)** en el listado de Personal.
- Nuevo indicador estadístico de cocineras(os).
- La ficha identifica correctamente esta clasificación.
- Las asignaciones académicas siguen siendo exclusivas para `DOCENTE`.

## Base de datos
Cambio aditivo: se agrega un valor al enum `StaffType`. No elimina ni modifica registros existentes.
