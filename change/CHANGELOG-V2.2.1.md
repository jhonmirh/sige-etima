# SIGE-ETIMA V2.2.1 — Control académico de notas

## Selección de trabajo
- ADMIN, DIRECTOR y SECRETARÍA pueden consultar por año escolar → docente → materia/sección → lapso.
- ADMIN puede transcribir notas además de los docentes.
- DOCENTE solo ve sus propias asignaciones académicas.
- La lista de materias se filtra automáticamente según el docente seleccionado.

## Seguridad de lapsos
- Solo ADMIN puede ACTIVAR o DESACTIVAR cada lapso del año escolar.
- Un lapso INACTIVO permite consulta, pero bloquea creación/edición de evaluaciones, transcripción de notas y cálculo de definitiva del lapso.
- Crear una evaluación ya no activa el lapso automáticamente.

## Método de cálculo por materia y lapso
Se incorpora `AssignmentLapseConfig` con dos modalidades:

### ACUMULATIVA
- Todas las evaluaciones tienen igual peso.
- Definitiva = suma de calificaciones efectivas / cantidad de evaluaciones.
- El resultado se redondea al entero más cercano.
- Ejemplo: 10 + 12 + 13 = 35 / 3 = 11,67 → 12.

### PERCENTUAL
- El docente/ADMIN indica el porcentaje de cada evaluación.
- Antes de calcular la definitiva, la suma debe ser exactamente 100%.
- Si suma 99%, 101% u otro valor, el cierre se bloquea con un mensaje explícito.

## Definitiva del lapso
- Se mejoró el diagnóstico de cierre: el error aparece junto al bloque de definitiva y especifica estudiante/evaluación pendiente.
- Segunda forma presentada sustituye a primera forma para el cálculo.
- Inasistencia en primera forma computa 0 y no habilita segunda forma.

## Cambio de docente
- ADMIN puede cambiar el docente responsable de una materia/sección.
- Se conserva la misma asignación y, por tanto, sus evaluaciones, calificaciones y definitivas.
- El cambio queda registrado en AuditLog.

## Nómina por materia
- Se agrega descarga XLSX de la nómina de la materia seleccionada.
- DOCENTE solo puede descargar nóminas de sus propias asignaciones.
- ADMIN/DIRECTOR/SECRETARÍA pueden consultar las asignaciones según sus permisos.

## Restricción del rol DOCENTE
- Al iniciar sesión, DOCENTE entra directamente a Notas.
- El menú del DOCENTE muestra únicamente Notas.
- Se restringieron rutas académicas, matrícula, grupos, reportes generales e institución para que el rol DOCENTE no pueda usarlas directamente.
- El reporte XLSX por asignación sí está autorizado y verifica que la materia pertenezca al docente autenticado.

## Base de datos
Cambio aditivo:
- Enum `GradingCalculationMode`: PERCENTUAL / ACUMULATIVA.
- Nueva tabla `AssignmentLapseConfig`.
- No elimina ni modifica destructivamente estudiantes, representantes, personal, matrículas ni notas existentes.
- Para compatibilidad, si una asignación antigua ya tiene evaluaciones cuya ponderación suma exactamente 100%, se interpreta inicialmente como PERCENTUAL; en otro caso se interpreta como ACUMULATIVA hasta que se seleccione explícitamente el método.
