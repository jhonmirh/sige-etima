# SIGE-ETIMA — Sistema Integral de Gestión Escolar

**Versión de trabajo: V2.0.1 — Fase 1 Estudiantes + Representantes**

Sistema web para la Escuela Técnica Isaías Medina Angarita, construido como monorepo:

- **Frontend:** Next.js + TypeScript (App Router), UI responsive, azul marino, modo claro/oscuro.
- **Backend:** NestJS + TypeScript, REST API modular, JWT + refresh token, RBAC, auditoría.
- **Base de datos:** PostgreSQL + Prisma ORM.
- **Infraestructura local:** Docker Compose.

## Estado funcional actual

- **Fase 1 — Estudiantes + Representantes:** desarrollada de extremo a extremo en V2.0.1.
- **Matrícula:** base funcional, pendiente de completar todos los flujos administrativos.
- **Personal:** consulta/backend base; pendiente de completar toda la operación visual.
- **Notas, materia pendiente y revisión:** motor/base parcial; UI operativa completa pendiente.
- **Planes de estudio:** datos y modelo parametrizable; administración visual completa pendiente.
- **Grupos estables:** base funcional parcial.
- **Centro de reportes:** servicios iniciales; catálogo completo de reportes/filtros pendiente.
- **Institución, usuarios y auditoría:** base disponible; administración visual ampliada pendiente.

La matriz detallada se mantiene en `docs/04-matriz-cobertura.md` y los cambios de esta fase en `docs/09-fase1-estudiantes-representantes.md`.

## Inicio rápido

```bash
cp .env.example .env
# Cambie claves y contraseña inicial antes de producción.
docker compose up --build
```

Luego:
- Web: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs

En el primer arranque, el contenedor API ejecuta `prisma db push` y el seed.

## Credenciales iniciales

Se toman de `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`. Cámbielas inmediatamente.

## Importante sobre reglas académicas

La narrativa define con mucho detalle oportunidades, formas y condiciones, pero **no especifica una fórmula única para promediar las 2–5 evaluaciones de cada lapso ni el umbral cuantitativo general de aprobación**. Por eso el sistema deja estos parámetros configurables (`GradingPolicy`). El seed usa 10/20 como valor inicial operativo, que debe ser validado por la institución antes de producción.

Consulte `docs/` para arquitectura, modelo de datos, operación, reglas académicas, API y matriz de cobertura.
