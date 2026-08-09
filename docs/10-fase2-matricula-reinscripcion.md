# SIGE-ETIMA V2.0.3 — Matrícula y Reinscripción

## Principio de datos

`Student` representa a la persona y no se duplica cada año. `Enrollment` representa su situación académica en un año escolar concreto.

La reinscripción recupera por nacionalidad + cédula:
- ficha del estudiante;
- representante(s) vinculados;
- última matrícula anterior al año destino;
- definitiva anual proveniente de Notas;
- plan, grado y sección de procedencia;
- último registro antropométrico.

## Regla académica oficial

La condición para reinscripción no se decide manualmente en Secretaría. Se deriva de la definitiva anual:

- 0 materias reprobadas: `REGULAR`, pasa al siguiente grado y cursa todas las materias del nuevo grado.
- 1 o 2 materias reprobadas: `MATERIA_PENDIENTE`, pasa al siguiente grado, cursa el plan completo del nuevo grado y conserva las materias pendientes del año anterior. Si ya está en el último grado del plan, permanece en ese grado y cursa únicamente las pendientes.
- Más de 2 materias reprobadas: `REPITIENTE`, permanece en el mismo grado y cursa **únicamente las materias reprobadas**.
- Último grado del plan + 0 reprobadas: elegible a `GRADUADO`; no corresponde reinscripción a un grado inexistente.

## Materias activas por matrícula

Se agregó `EnrollmentSubject` para conservar exactamente qué asignaturas debe cursar cada estudiante en cada matrícula:

- `PLAN_ACTUAL`: materias normales del grado.
- `MATERIA_PENDIENTE`: materias reprobadas que provienen del año anterior.
- `REPITENCIA`: materias reprobadas que debe volver a cursar el estudiante repitiente.

Esta tabla será también la base para que el módulo de Notas no muestre a un repitiente en materias que ya tiene aprobadas.

## Materia pendiente

Al formalizar una reinscripción con `MATERIA_PENDIENTE`, el backend crea las materias pendientes y sus cuatro oportunidades:
1. OCTUBRE
2. DICIEMBRE
3. FEBRERO
4. MARZO

Cada oportunidad continuará usando primera y segunda forma según la normativa del módulo de Notas.

## Número de lista

La sección incorpora `rosterLockedAt`.

Antes del cierre de nómina:
- los estudiantes pueden estar sin número definitivo;
- al cerrar, se ordenan por cédula y se asigna el número fijo.

Después del cierre:
- todo nuevo inscrito se agrega al final;
- un retiro nunca reutiliza ni altera el número del estudiante.

## Reinscripción

Ruta web: `/enrollments/reenroll`

Flujo:
1. Seleccionar año escolar destino.
2. Buscar V/E + cédula numérica.
3. Mostrar ficha y representante.
4. Permitir actualización de dirección, teléfono, correo y antropometría.
5. Leer definitiva del año anterior.
6. Calcular condición/grado/materias.
7. Sugerir sección con el mismo nombre cuando existe en el nuevo grado.
8. Permitir cambiar sección entre las compatibles.
9. Formalizar la nueva matrícula.

## Configuración anual

Ruta web: `/enrollments/configuration`

Permite:
- crear años escolares;
- activar un período;
- crear secciones;
- clonar secciones desde otro período;
- cerrar nómina inicial y fijar números de lista.

## Seguridad

- Secretaría puede matricular/reinscribir y retirar.
- Solo ADMIN/DIRECTOR pueden cambiar manualmente una condición académica o validar graduación.
- Las operaciones de escritura quedan registradas por el interceptor de auditoría existente.

## Inactivación administrativa al cierre
Se agregó `Enrollment.academicCondition` para conservar la condición derivada de la definitiva aunque, al cierre administrativo, `Enrollment.condition` pase a `INACTIVO`. De esta forma la reinscripción puede seguir leyendo la definitiva y el histórico no pierde si el estudiante cerró como Regular, Materia Pendiente o Repitiente.

## Cierre académico previo a reinscripción

La reinscripción se bloquea si:
- falta alguna definitiva anual de las materias que el estudiante debía cursar;
- existe una materia pendiente de un año anterior que todavía no está marcada como `APROBADA`.

De esta manera Secretaría no puede adelantar una matrícula mientras Notas/Pendientes no haya completado el resultado académico.

## Representante durante matrícula

La formalización exige al menos un representante activo vinculado. Si falta, la interfaz ofrece:
- `Asignar existente`, útil cuando el mismo representante ya tiene otro estudiante;
- `Crear representante`, que conserva el flujo de vinculación automática.

## Retiro

El retiro exige:
- fecha dentro del año escolar;
- motivo;
- plantel de destino.

La matrícula no se elimina y el número de lista no se modifica. Los primeros 30 días generan `RETIRADO`; posteriormente se genera `RETIRADO_MODIFICADO`.

## Prueba de orden de nómina

Antes del cierre, la vista previa se ordena por el valor numérico de la cédula. Al cerrar la nómina, ese orden se convierte en números de lista 1..N. Los inscritos posteriores reciben `max(listNumber)+1`.
