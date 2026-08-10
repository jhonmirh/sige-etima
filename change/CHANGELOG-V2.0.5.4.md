# SIGE-ETIMA V2.0.5.4 — consistencia de altas, edades y formalización

## Correcciones principales

### 1. Registros nuevos visibles sin datos obsoletos
- Todas las llamadas del helper `api()` usan `cache: no-store` por defecto.
- Los listados de Estudiantes y Representantes se actualizan al recuperar el foco de la ventana.
- Las pantallas de vinculación Estudiante ↔ Representante se actualizan al recuperar el foco y agregan el botón **Actualizar lista**.
- Esto evita que un estudiante o representante recién creado quede temporalmente fuera de los selectores/listas por datos en caché.

### 2. Edad mínima del estudiante
- Fecha de nacimiento sigue siendo obligatoria.
- Edad mínima: **10 años cumplidos**.
- El formulario muestra la edad calculada y limita el calendario a fechas compatibles con 10 años o más.
- El API valida la misma regla; no depende solo del navegador.
- Primera Matrícula vuelve a validar la edad para cubrir expedientes antiguos creados antes de esta versión.

### 3. Edad mínima del representante
- Fecha de nacimiento del representante pasa a ser **obligatoria en nuevas altas**.
- El formulario muestra **Edad actual**.
- Edad mínima: **18 años cumplidos**.
- El API valida la regla.
- Primera Matrícula exige al menos un representante activo vinculado con fecha de nacimiento registrada y edad de 18 años o más.

### 4. Formalizar matrícula ya no falla silenciosamente
- El botón **Formalizar matrícula** queda disponible salvo mientras se está guardando.
- Al pulsarlo se ejecuta una validación integral y se informa exactamente qué dato falta.
- Ya no se depende del bloqueo silencioso de validaciones HTML para los requisitos de matrícula.
- Validaciones explícitas: estudiante, edad mínima, representante adulto, ausencia de historial previo en ETIMA, año, plan, mención, sección, fecha, último año aprobado, literal en 1° año, plantel de procedencia, condición académica, materias reprobadas cuando correspondan, estatura y peso.

### 5. Datos obligatorios reforzados también en backend
Para Primera Matrícula el API exige además:
- fecha de inscripción;
- último año aprobado;
- literal A/B/C/D cuando se ingresa a 1° año;
- plantel de procedencia;
- estatura y peso;
- sección con mención configurada;
- estudiante de al menos 10 años;
- representante adulto válido.

## Regla temporal
El cálculo de edad usa la fecha civil de la institución en **America/Caracas**.

## Base de datos
No cambia el esquema Prisma. No requiere migración ni elimina datos existentes.
