# SIGE-ETIMA V2.0.4.9 — Retiro y fijación correcta de nómina

## Regla institucional implementada

- El **31 de octubre es el último día de matrícula ordinaria**.
- La nómina permanece **PROVISIONAL durante todo el 31/10**.
- La nómina queda **FIJA automáticamente desde el 01/11**.
- Hasta el 31/10 inclusive, la nómina se ordena numéricamente por cédula.
- Un retiro efectivo hasta el 31/10 inclusive **sale de la nómina** y la numeración provisional se recalcula por cédula.
- Desde el 01/11, un estudiante retirado **permanece en la nómina ocupando su número**.
- Desde el 01/11, nuevas inscripciones/reinscripciones reciben números al final; los números ya ocupados no se reutilizan.

## Mejoras de interfaz

- Aviso automático PROVISIONAL / FIJA corregido.
- En Matrícula se agregó una acción visible `Gestionar / Retiro`.
- Los retiros anteriores al 01/11 permanecen en el expediente para auditoría, pero aparecen como `FUERA DE NÓMINA` y no forman parte de la nómina oficial.
- La ficha de matrícula explica automáticamente qué ocurrirá según la fecha de retiro.
- Se solicita confirmación antes de registrar el retiro.

## Backend y reportes

- La fijación automática usa ahora 01/11 00:00 hora de Venezuela.
- La nómina oficial y su exportación excluyen retiros realizados hasta el 31/10 inclusive.
- Retiros posteriores al cierre conservan su posición.
- Se bloquea un retiro retroactivo hasta el 31/10 si la nómina ya fue fijada, para evitar modificar números definitivos sin un procedimiento administrativo auditado.
- Se agregan tipos de retiro compatibles con la nueva regla, conservando los valores históricos anteriores.
