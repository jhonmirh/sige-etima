# SIGE-ETIMA V2.2.2.4 — Objetivos heredados + confirmación global de guardado

## Corrección de objetivo pendiente
- Se corrigió la regularización de evaluaciones antiguas con `OBJETIVO PENDIENTE`.
- Al usar **Completar objetivo**, el sistema ahora valida y guarda exclusivamente el objetivo.
- Ya no se vuelve a validar la fecha/hora, técnica, instrumento o ponderación de una evaluación heredada al completar su objetivo.
- Esto evita que evaluaciones antiguas creadas antes de las reglas actuales (por ejemplo, con hora fuera del nuevo horario permitido) bloqueen silenciosamente la incorporación del objetivo.
- Después de guardar se recarga el espacio de trabajo y desaparece `OBJETIVO PENDIENTE`.

## Confirmación visual en todos los módulos
- Se añadió un aviso global temporal y accesible para operaciones de guardado del sistema.
- Las operaciones `POST`, `PATCH`, `PUT` y `DELETE` realizadas mediante el cliente API muestran una confirmación breve en la parte superior.
- Mensajes base: `Guardado correctamente`, `Cambios guardados correctamente`, `Eliminado correctamente`, y mensajes específicos cuando corresponde.
- El aviso desaparece automáticamente aproximadamente a los 2 segundos y puede cerrarse manualmente.
- Responsive para escritorio, tablet y teléfono.
- Se conservan los mensajes propios que algunos módulos ya mostraban dentro de la pantalla.

## Base de datos
- Sin cambios de Prisma.
- Sin cambios de PostgreSQL.
