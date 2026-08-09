# SIGE-ETIMA V2.0.4.1 — Modalidad + Mención por plan

## Objetivo
Corregir la interpretación del catálogo de menciones para que no sea exclusivo de Educación Media Técnica.

## Regla académica
- Plan 31059 → Modalidad: EDUCACIÓN MEDIA GENERAL → Mención: BACHILLER.
- Plan 41049 → Modalidad: EDUCACIÓN MEDIA TÉCNICA → Mención: CIENCIAS AGRÍCOLAS Y PECUARIAS.
- La modalidad pertenece al plan de estudio.
- La mención queda vinculada al plan y, por tanto, hereda su modalidad.
- En creación de secciones y primera matrícula la mención es obligatoria para ambos planes.
- La reinscripción conserva la mención del período anterior.

## Cambios
- Seed idempotente crea/activa BACHILLER para 31059.
- Seed conserva/activa CIENCIAS AGRÍCOLAS Y PECUARIAS para 41049.
- Secciones antiguas de 31059 sin mención se normalizan automáticamente a BACHILLER.
- Secciones antiguas de 41049 sin mención se normalizan a CIENCIAS AGRÍCOLAS Y PECUARIAS.
- Catálogo de menciones muestra MODALIDAD, PLAN y MENCIÓN.
- Se elimina la regla que impedía registrar menciones en Media General.
- Al crear una sección se exige una mención activa perteneciente al plan seleccionado.
- Primera matrícula muestra Modalidad y exige Mención.
- Mensaje de reinscripción se generaliza: la mención del plan debe conservarse.

## Base de datos
No se modifica el esquema Prisma respecto de V2.0.4. El cambio de datos se realiza mediante seed idempotente, por lo que no requiere --accept-data-loss.
