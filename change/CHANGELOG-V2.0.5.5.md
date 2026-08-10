# SIGE-ETIMA V2.0.5.5 — Integridad de expediente y vinculación

## Correcciones

1. **Listado para vincular estudiantes a representantes**
   - La pantalla ya no usa el filtro académico `active=true`.
   - Carga todos los estudiantes registrados y muestra los que tienen la ficha base activa.
   - Esto permite que un estudiante recién creado aparezca inmediatamente, aunque todavía no tenga matrícula.

2. **Bloqueo de matrícula sin representante**
   - Primera matrícula, reinscripción y reincorporación validan en backend que exista al menos un representante activo vinculado.
   - El representante debe tener al menos 18 años y sus datos obligatorios completos.

3. **Expediente del estudiante obligatorio**
   Antes de primera matrícula, reinscripción o reincorporación se validan:
   - nacionalidad y cédula;
   - nombres/apellidos básicos;
   - sexo;
   - fecha y lugar de nacimiento;
   - estado, municipio y parroquia de nacimiento;
   - dirección;
   - estado, municipio y parroquia de residencia;
   - convivencia;
   - teléfono;
   - correo electrónico;
   - edad mínima de 10 años;
   - detalle de discapacidad/alergia cuando corresponda.

4. **Representante adulto completo**
   Debe existir al menos un representante activo con:
   - nacionalidad;
   - cédula;
   - primer nombre y apellido;
   - dirección;
   - fecha de nacimiento;
   - teléfono principal;
   - edad mínima de 18 años.

5. **UX de Matrícula**
   - Primera matrícula muestra identificación, edad, sexo, teléfono, correo y representante.
   - Reinscripción/reincorporación muestran la misma información resumida.
   - Si el expediente está incompleto aparece una alerta con los campos faltantes y accesos para completar ficha/representante.
   - El backend mantiene el bloqueo aunque se intente llamar la API directamente.

## Base de datos
No cambia el esquema Prisma. No requiere migración.
