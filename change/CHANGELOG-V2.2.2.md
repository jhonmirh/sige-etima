# SIGE-ETIMA V2.2.2 — Validación de evaluaciones y formato de notas

## Notas
- Las notas manuales de estudiantes PRESENTES se validan entre 01 y 20.
- Al salir del campo, valores menores de 10 se normalizan visualmente con cero a la izquierda (05, 06, 09).
- Definitivas y notas mostradas usan el mismo formato de dos posiciones enteras (00–20; 00 puede provenir únicamente de inasistencia calculada por el sistema).
- El backend vuelve a validar el rango; no depende solo del navegador.

## Evaluaciones
- `Título` pasa a mostrarse como `Contenido evaluado` (se conserva el campo interno histórico para compatibilidad).
- Nuevo campo obligatorio `Objetivo`, numérico y decimal (ej. 1, 1.1, 2.3).
- Un objetivo no puede repetirse dentro de la misma materia/asignación durante el año escolar.
- Los registros anteriores pueden conservar objetivo nulo, pero deben editarse y asignar objetivo antes de cerrar el lapso.
- Técnicas e instrumentos ahora se seleccionan desde listas predefinidas.
- Si se selecciona `OTRA/OTRO`, aparece un textbox obligatorio para especificarlo.

## Fecha y hora de evaluación
- Debe estar dentro de las fechas del lapso.
- Se bloquean sábados y domingos.
- Horario permitido: 07:00 a. m. a 06:00 p. m.
- Las evaluaciones deben respetar orden cronológico: Evaluación 2 posterior a Evaluación 1, etc.
- Al editar una evaluación, su fecha debe permanecer entre la evaluación anterior y la siguiente.

## Base de datos
- `Assessment.objective Decimal?` agregado de forma aditiva.
- Índice único por `teacherAssignmentId + objective`.
- No se eliminan notas, evaluaciones, matrículas ni estudiantes existentes.
