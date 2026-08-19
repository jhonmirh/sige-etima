# SIGE-ETIMA V2.2.2.9 — Inasistencias por materia y lapso

- Añade el registro de **inasistencias totales del lapso** por estudiante, materia y lapso directamente en la tabla **Definitiva del lapso**.
- El campo es **opcional**: si el estudiante no tuvo inasistencias se deja vacío.
- Solo se admiten números enteros positivos: **1, 2, 3...**; se rechazan 0, negativos, decimales y texto.
- Las inasistencias se guardan junto con el cálculo de la definitiva del lapso y se recuperan al volver a entrar al mismo lapso/materia.
- ADMIN y DOCENTE pueden registrar el dato cuando el lapso está ACTIVO. DIRECTOR y SECRETARÍA lo visualizan en modo consulta.
- La estructura `LapseGrade` incorpora el campo nullable `absences Int?`, manteniendo intactas las definitivas existentes.
- El endpoint de cierre masivo acepta las inasistencias por matrícula y las persiste en la misma transacción de las definitivas.
- La definitiva anual y sus reglas de cálculo no cambian.
- Requiere reconstruir **api y web**. Al iniciar la API, `prisma db push` agregará la columna nullable sin eliminar datos existentes.
