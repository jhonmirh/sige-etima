# SIGE-ETIMA V2.0.4.2.1

- Corrige TS2749 en `apps/api/src/reports/reports.ts`.
- El helper `officialHeader` deja de usar `PDFDocument` como tipo incompatible con la forma en que `pdfkit` está importado en el proyecto.
- No cambia el comportamiento de generación de PDFs ni los logos institucionales.
- Sin cambios de base de datos o Prisma.
