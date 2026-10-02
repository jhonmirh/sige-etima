# SIGE-ETIMA V2.0.5.2 — Estado académico y reincorporación de retirados

## Correcciones

1. La lista de estudiantes ya no usa únicamente `Student.active` para mostrar el estado.
   - REGULAR, MATERIA_PENDIENTE y REPITIENTE se consideran académicamente activos.
   - RETIRADO y RETIRADO_MODIFICADO se muestran como RETIRADO y aparecen entre los no activos académicamente.
   - INACTIVO y GRADUADO conservan su estado correspondiente.

2. La pantalla de Reinscripción distingue una matrícula existente activa de una matrícula retirada.
   - Si la matrícula del año destino está REGULAR, MATERIA_PENDIENTE o REPITIENTE, se mantiene el bloqueo y el aviso de que ya está matriculado.
   - Si está RETIRADO o RETIRADO_MODIFICADO, se habilita la REINCORPORACIÓN al mismo año escolar sin crear una matrícula duplicada.

3. Reincorporación y número de lista.
   - Retiro y regreso antes del 01/11: vuelve a la nómina provisional y se ordena por cédula.
   - Retiro antes del cierre y regreso después del 01/11: se agrega al final de la nómina fija con el siguiente número disponible.
   - Retiro después del 01/11: conserva el número de lista que ya tenía al reincorporarse.

4. Al retirar se conserva la condición académica previa (REGULAR, MATERIA_PENDIENTE o REPITIENTE) en `academicCondition` para poder restaurarla correctamente.

5. Se agrega historial de movimientos de matrícula (`EnrollmentMovement`) para registrar RETIRO y REINCORPORACION sin perder trazabilidad al eliminar el retiro vigente durante una reincorporación.

## Base de datos

Cambio aditivo: nueva tabla `EnrollmentMovement` y enum `EnrollmentMovementType`. No elimina ni transforma datos existentes.
