# SIGE-ETIMA V2.2.0.1 — Hotfix Build Notas

Corrección de compilación TypeScript en `apps/api/src/grading/grading.ts`.

## Problema corregido
TypeScript infería la variable `status` como el literal `AttemptStatus.INASISTENTE`, por lo que posteriormente rechazaba la asignación `AttemptStatus.PRESENTADA` en la carga individual y masiva de calificaciones.

## Corrección
Se tipó explícitamente la variable como `AttemptStatus` en ambos flujos:

```ts
let status: AttemptStatus = AttemptStatus.INASISTENTE;
```

No modifica Prisma ni PostgreSQL y no cambia las reglas funcionales de Notas.
