# SIGE-ETIMA V2.0.7.4 — Normalización de activación de planes

## Corrección principal
- El catálogo nacional sigue precargado, pero los planes NO utilizados por la institución quedan **INACTIVOS**.
- Se conservan activos automáticamente los planes que ya tienen secciones o matrículas para proteger el histórico.
- La corrección de datos se ejecuta una sola vez y queda marcada en `AuditLog`, evitando que futuros reinicios desactiven planes que el Administrador active posteriormente.
- Los planes nuevos del catálogo continúan naciendo INACTIVOS.

## Catálogo de menciones
- El bloque "Catálogo de menciones" muestra y permite administrar únicamente menciones pertenecientes a planes ACTIVOS de la institución.
- Las menciones precargadas de planes todavía inactivos dejan de dar la impresión de que esos planes ya están habilitados.

## Media General
- `31059 · BACHILLER` permanece disponible y, si ya tiene secciones/matrículas, se conserva ACTIVO.
- `31060 · CIENCIA Y TECNOLOGÍA` permanece precargado en el catálogo como INACTIVO hasta que la institución decida activarlo.

## Base de datos
- No cambia el esquema Prisma.
- No elimina planes, materias, matrículas, secciones ni notas.
