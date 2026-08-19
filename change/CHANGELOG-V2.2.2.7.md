# SIGE-ETIMA V2.2.2.7 — Fechas de lapsos administrables

- El ADMINISTRADOR puede definir manualmente las fechas **Desde** y **Hasta** de cada lapso desde el módulo Notas.
- Los campos aparecen debajo de los controles Activar/Desactivar de cada Lapso.
- Las fechas dejan de tratarse como un calendario fijo: pueden ajustarse según el cronograma oficial que comunique el MPPE para cada año escolar.
- Se valida que Desde no sea posterior a Hasta.
- Se valida que las fechas permanezcan dentro del año escolar seleccionado.
- Se evita solapamiento o desorden cronológico entre Lapso 1, Lapso 2 y Lapso 3.
- Si ya existe una evaluación registrada fuera del nuevo rango, el sistema bloquea el cambio y explica que primero debe corregirse la fecha de esa evaluación.
- Solo ADMIN puede modificar las fechas; docentes continúan trabajando con el calendario definido por Administración.
- Se muestra confirmación temporal al guardar correctamente las fechas.
- No hay cambios de Prisma ni de estructura de PostgreSQL.
