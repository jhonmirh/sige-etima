# SIGE-ETIMA V2.0.4.2 — Identidad visual institucional

## Objetivo
Sustituir los logos difusos heredados de la narrativa por los archivos institucionales de mayor resolución entregados por el usuario y dejar una única identidad visual para interfaz y documentos generados.

## Cambios
- Escudo ET Isaías Medina Angarita reemplazado por la nueva versión de mayor resolución y fondo transparente.
- Identidad del Ministerio del Poder Popular para la Educación reemplazada por la nueva versión de mayor resolución y fondo transparente.
- Login, menú lateral e Institución consumen una fuente central de branding (`apps/web/src/lib/branding.ts`).
- La pantalla Institución muestra ambos logos oficiales.
- Las constancias PDF de estudio y trabajo incorporan automáticamente ambos logos en su encabezado.
- El seed normaliza `schoolLogoPath` y `ministryLogoPath` también para instituciones ya existentes.
- Se mantiene `/brand/ministerio.png` como alias de compatibilidad, aunque la ruta oficial pasa a `/brand/ministerio-identidad.png`.

## Base de datos
No se modifica el esquema Prisma. El seed únicamente actualiza las rutas institucionales de logos, por lo que no requiere migración ni `--accept-data-loss`.
