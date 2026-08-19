# SIGE-ETIMA V2.2.2.3 — Hotfix objetivos pendientes y validación visible de notas

## Correcciones
- Las evaluaciones heredadas con `OBJETIVO PENDIENTE` muestran un botón **Completar objetivo**.
- El ADMINISTRADOR puede completar únicamente el objetivo de una evaluación heredada aunque el lapso esté inactivo, sin reabrir la carga de notas.
- El DOCENTE responsable puede completar el objetivo pendiente cuando el lapso esté activo.
- El cierre del lapso identifica exactamente qué evaluaciones carecen de objetivo y orienta al usuario a completarlas.
- La carga de Primera y Segunda Forma valida notas de forma inmediata y al perder el foco.
- Valores menores a 01, mayores a 20, no numéricos o vacíos cuando el estudiante está PRESENTE muestran un mensaje visible junto al campo.
- Al pulsar Guardar con una nota inválida, se muestra un aviso dentro de la misma evaluación, el sistema desplaza la vista al campo problemático y coloca el foco sobre él.
- Las notas válidas menores de 10 se normalizan con cero a la izquierda (`5` → `05`).

## Seguridad
- La reparación de objetivos heredados no modifica contenido, técnica, instrumento, fecha ni ponderación.
- No se habilita la transcripción de notas si el lapso está inactivo.
- La regla de objetivo no repetido continúa validándose en el backend.

## Base de datos
- Sin cambios de Prisma ni PostgreSQL.
