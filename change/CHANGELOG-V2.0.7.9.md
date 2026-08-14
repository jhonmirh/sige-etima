# SIGE-ETIMA V2.0.7.9 — Sidebar responsive por iconos

## Corrección
- El panel lateral ya no comprime ni corta las etiquetas en laptops/tablets.
- En escritorio amplio (>=1280 px) conserva logo, nombre del sistema y etiquetas completas.
- En laptops compactas y tablets (641–1279 px) se convierte automáticamente en un rail lateral de iconos.
- En celulares (<=640 px) conserva un panel lateral más estrecho, solo con iconos táctiles.
- Los iconos muestran el nombre de la opción mediante tooltip/title en modo compacto.
- Se agregó indicador visual de la sección activa.
- Tema y cierre de sesión se compactan a iconos en celulares.
- El contenido principal recalcula su ancho y evita que el sidebar invada o corte las páginas.

## Archivos modificados
- apps/web/src/components/Shell.tsx
- apps/web/src/app/globals.css

No modifica API, Prisma ni PostgreSQL.
