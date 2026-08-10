# SIGE-ETIMA V2.0.7.3 — Hotfix acumulativo Prisma/Planes

## Corrección
La V2.0.7.2 podía instalarse sobre una base que no había recibido previamente el `schema.prisma` ampliado de V2.0.7. En ese caso `academic.ts` usaba campos nuevos (`hasMention`, `specialtyName`, `curriculumVerified`, etc.) pero Prisma Client se generaba desde el esquema anterior y el build NestJS fallaba.

## Este parche es acumulativo
Incluye en una sola instalación:
- `schema.prisma` ampliado para catálogo nacional de planes.
- seed del catálogo de planes.
- catálogo oficial precargado.
- API de planes/mallas.
- protección de continuidad de plan en reinscripción.
- interfaz de Planes de estudio y acceso desde Configuración anual.

No elimina estudiantes, representantes, matrículas ni notas. Los campos nuevos de `StudyPlan` son opcionales o tienen valores por defecto.
