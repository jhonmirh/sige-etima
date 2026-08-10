# SIGE-ETIMA V2.0.4.5 — Corrección selector de sección

## Corrección
- En Primera Matrícula, el selector **Sección** ya no antepone la mención al nombre de la sección.
- En Reinscripción, se aplica la misma corrección para mantener consistencia.
- La opción ahora muestra el **nombre real de la sección** y su turno, por ejemplo:
  - `ANDRÉS BELLO · INTEGRAL`
  - `SIMÓN BOLÍVAR · MEDIO DÍA MAÑANA`
- La mención continúa mostrándose exclusivamente en el campo **Mención**, evitando confundir mención con sección.

## Alcance técnico
- Solo frontend Next.js.
- No modifica Prisma ni PostgreSQL.
- No altera matrículas, estudiantes, representantes, secciones ni menciones existentes.
