# SIGE-ETIMA V2.0.4 — Menciones de Educación Media Técnica

## Objetivo
Separar correctamente la matrícula y las nóminas por año escolar, plan, grado, mención y sección, manteniendo Media General sin mención.

## Cambios principales
- Nuevo catálogo `Mention` asociado a `StudyPlan`.
- El Administrador puede crear, renombrar, activar e inactivar menciones.
- Las menciones solo se permiten en planes `MEDIA_TECNICA`.
- Cada `Section` técnica queda vinculada a una mención y conserva `mentionName` como fotografía histórica.
- El seed incorpora `CIENCIAS AGRÍCOLAS Y PECUARIAS` al plan 41049.
- Las secciones técnicas creadas antes de V2.0.4 se vinculan automáticamente a esa mención durante el seed, sin modificar matrícula ni numeración.
- Primera matrícula exige seleccionar mención cuando el plan es técnico.
- Reinscripción conserva automáticamente la mención del año anterior.
- La reinscripción ordinaria bloquea cambios de mención; un cambio de mención requerirá un procedimiento administrativo especial.
- Listados y trayectoria muestran Mención.
- El orden de matrícula queda: año escolar → plan → grado → mención → sección → número de lista.
- Constancia de estudio y estadísticas incorporan la mención cuando aplica.
- La clonación anual de secciones conserva la asociación con la mención y usa el nombre vigente del catálogo en el nuevo período.

## Integridad histórica
Renombrar una mención en el catálogo no reescribe el nombre guardado en secciones históricas ya creadas. Las nuevas secciones usan el nombre vigente del catálogo.

## Regla de nómina
No cambia la regla V2.0.3.4: antes del 31 de octubre la numeración es provisional por cédula; desde el 31 de octubre inclusive queda fija automáticamente y los nuevos ingresos se agregan al final de su sección.
