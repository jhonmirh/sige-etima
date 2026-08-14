# SIGE-ETIMA V2.1.0 — Personal y asignaciones docentes

## Alcance
Se desarrolla la fase de Personal como prerrequisito operativo del módulo de Notas.

### Personal
- Clasificación obligatoria: DOCENTE, ADMINISTRATIVO u OBRERO.
- Alta, edición, consulta, búsqueda, filtros, activación e inactivación.
- Datos de la narrativa: cédula, estado civil, nombres y apellidos, dirección, sexo, nacimiento, discapacidad/informe médico, número de hijos, código y descripción de cargo, función institucional, tallas, banco, tipo/número de cuenta y fecha de ingreso al MPPE.
- Validaciones de nombres, cédula, teléfono y cuenta bancaria.
- Normalización a mayúsculas de los campos nominales/descriptivos.

### Formación profesional
- Registro múltiple de PREGRADO, ESPECIALIZACIÓN, MAESTRÍA, DOCTORADO y OTRO.
- Edición y eliminación controlada de títulos.

### Asignaciones docentes
- Solo personal DOCENTE y ACTIVO puede recibir materias/secciones.
- Selección por año escolar → sección → materia compatible con el plan y grado.
- Un docente puede impartir varias materias y varias secciones.
- Las asignaciones se inactivan/reactivan sin borrar el histórico.
- Al inactivar a un docente, sus asignaciones activas se inactivan automáticamente.
- No se crean asignaciones para años académicamente finalizados.
- El módulo de Notas rechaza operaciones asociadas a una asignación docente inactiva.

### Interfaz
- Nueva ficha integral de Personal.
- Nuevo formulario de alta/edición.
- Filtros por tipo y estado.
- Acceso a constancia de trabajo en PDF desde la ficha.
- Diseño responsive reutilizando las reglas V2.0.7.9.

## Base de datos
Cambios aditivos:
- Nuevo enum `StaffType`: DOCENTE, ADMINISTRATIVO, OBRERO.
- `Staff.staffType` con valor por defecto DOCENTE para compatibilidad con registros existentes.
- `TeacherAssignment.active`.
- `TeacherAssignment.assignedAt`.

No se eliminan registros existentes.
