# SIGE-ETIMA V2.0.3

## Matrícula / Reinscripción
- Reinscripción por nacionalidad + cédula.
- Recuperación de estudiante, representantes, histórico y antropometría.
- La definitiva anual determina condición, grado y materias.
- REGULAR: promoción y plan completo del nuevo grado.
- MATERIA PENDIENTE: promoción + plan nuevo + materias pendientes.
- REPITIENTE: mismo grado y únicamente materias reprobadas.
- Tabla `EnrollmentSubject` para currículo individual por matrícula.
- Creación automática de oportunidades OCTUBRE/DICIEMBRE/FEBRERO/MARZO para materia pendiente.
- Bloqueo de notas en materias que no pertenecen al currículo activo del estudiante.
- Primera matrícula operativa.
- Configuración de años escolares y secciones.
- Clonado de secciones.
- Cierre de nómina y numeración fija.
- Altas posteriores al cierre al final de la lista.
- Retiro conserva número.
- Graduación validada contra definitiva del último grado.
- Inactivación administrativa preservando `academicCondition`.
- Actualización de dirección/teléfono/correo y nueva antropometría durante reinscripción.

- La nómina inicial se ordena por el valor numérico de la cédula antes de fijar números.
- La pantalla de primera matrícula y reinscripción permite crear o vincular un representante existente si falta.
- El retiro exige plantel de destino y fecha dentro del año escolar.
- Si existen materias pendientes anteriores sin resolver, la reinscripción queda bloqueada hasta completar el cierre académico.
- En el último grado con 1–2 materias reprobadas se conserva el grado y se cursan únicamente esas pendientes.
- La clonación de secciones permite elegir explícitamente el año escolar origen.
