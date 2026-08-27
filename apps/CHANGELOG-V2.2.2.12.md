# SIGE-ETIMA V2.2.2.12 — Administración validada y migraciones seguras

Bloque acumulativo sobre V2.2.2.11. No altera fórmulas, calificaciones ni reglas académicas institucionales.

## API administrativa

- Se sustituyen los cuerpos `any` de institución, aportes y graduación por DTOs validados.
- La edición institucional acepta únicamente los campos autorizados y rechaza propiedades protegidas como identificadores y fechas internas.
- Se validan UUID, correos, longitudes, fechas y montos con máximo de dos decimales.
- Los aportes deben ser mayores que cero y verifican la existencia del representante y del año escolar.
- Las operaciones de inactivación y graduación verifican que los registros indicados existan.
- La graduación masiva exige una lista no vacía, válida y limitada a 500 matrículas por solicitud.
- La ruta principal de aportes de representantes también valida UUID, monto positivo y longitudes máximas.

## Base de datos y despliegue

- Se incorpora una migración base completa y versionada para PostgreSQL.
- El contenedor deja de ejecutar `prisma db push` al arrancar y utiliza `prisma migrate deploy`.
- Las bases existentes se comparan con `schema.prisma` antes de registrar la migración base.
- Si se detecta diferencia estructural, el arranque se detiene sin modificar ni borrar datos.
- Las bases nuevas aplican la migración base normalmente y luego ejecutan el seed idempotente.

## Verificación

- Esquema Prisma válido.
- Migración base generada desde el esquema vigente.
- API NestJS compilada correctamente.
- Web Next.js compilada correctamente y 29 rutas generadas.
- Jest: 5 suites y 49 pruebas aprobadas.
