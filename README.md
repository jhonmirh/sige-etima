# SIGE-ETIMA — Sistema Integral de Gestión Escolar

Sistema web para la Escuela Técnica Isaías Medina Angarita, construido como monorepo:

- **Frontend:** Next.js + TypeScript (App Router), UI responsive, azul marino, modo claro/oscuro.
- **Backend:** NestJS + TypeScript, REST API modular, JWT + refresh token, RBAC, auditoría.
- **Base de datos:** PostgreSQL + Prisma ORM.
- **Infraestructura local:** Docker Compose.

## Cobertura funcional

1. Matrícula y ficha integral del estudiante.
2. Representantes, relaciones estudiante-representante, referencias de emergencia y aportes de inscripción.
3. Datos antropométricos por año escolar.
4. Documentos consignados y observaciones.
5. Docentes/personal, cargos, títulos y datos laborales/bancarios.
6. Años escolares, secciones con nombres de próceres y numeración de lista estable.
7. Planes de estudio parametrizables 31059 (Media General) y 41049 (Media Técnica).
8. Asignaciones docentes, lapsos, evaluaciones, primera/segunda forma, inasistencia, revisión y materia pendiente.
9. Grupos de participación/estables para Media General, incluso entre estudiantes de grados/secciones distintos.
10. Retiros sin romper la numeración histórica de la nómina.
11. Condiciones: Regular, Materia Pendiente, Repitiente, Retirado, Retirado Modificado, Graduado e Inactivo.
12. Dashboard y reportes exportables.
13. Constancias de estudio y de trabajo en PDF.
14. Auditoría de operaciones sensibles.

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
