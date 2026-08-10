# SIGE-ETIMA V2.0.7.2 — Asignación de planes de estudio

## Objetivo
Hacer visible y operativo el flujo completo para asignar nuevos planes de estudio a la institución y preparar automáticamente el soporte curricular que utiliza Matrícula y Notas.

## Cambios principales
- Nueva gestión completa en **Planes de estudio** para rol ADMINISTRADOR.
- Acción visible **Asignar un nuevo plan a la institución**.
- Selección guiada por **Modalidad → Código oficial → Opción / Especialidad → Mención → Malla curricular**.
- Los planes precargados se mantienen inactivos hasta que ETIMA los asigne.
- Nuevo endpoint semántico `POST /academic/plans/:id/assign`.
- Al asignar un plan se valida que tenga materias activas en todos sus años y, cuando corresponda, una mención activa.
- Media General se gestiona en 5 años; Media Técnica, en 6 años.
- Formulario para incorporar un código nuevo no existente en el catálogo, con validación de código único de 5 dígitos.
- Un plan manual nace INACTIVO y abre inmediatamente su editor de malla.
- Editor de malla por año con alta, edición y activación/inactivación de materias antes de que existan matrículas.
- Gestión de menciones desde la misma malla para planes que las requieran.
- La malla queda protegida cuando ya existen estudiantes matriculados.
- El plan activo pasa automáticamente a estar disponible en creación de secciones, Primera Matrícula y soporte de Notas.
- En Configuración de Matrícula se agrega un acceso destacado a la gestión de planes.
- Se mantiene la regla de continuidad: un estudiante interno no puede cambiar de modalidad ni de plan mediante Reinscripción.

## Base de datos
No agrega tablas ni columnas respecto de V2.0.7. Utiliza los modelos `StudyPlan`, `Mention`, `Subject` y `StudyPlanSubject` ya incorporados en esa versión.
