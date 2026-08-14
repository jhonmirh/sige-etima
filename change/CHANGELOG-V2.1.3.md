# SIGE-ETIMA V2.1.3 — Condición laboral y cargos manuales

## Datos laborales
- Se incorpora la condición laboral obligatoria del personal:
  - ACTIVO
  - REPOSO CONTINUO
  - INCAPACITADO
  - JUBILADO
  - EN PROCESO DE JUBILACIÓN
  - PROCESO ADMINISTRATIVO
- REPOSO CONTINUO exige enfermedad que origina el reposo y cantidad de reposos.
- INCAPACITADO exige ente ejecutor (IPASME o IVSS) y fecha de incapacidad.
- JUBILADO exige fecha de jubilación.
- EN PROCESO DE JUBILACIÓN exige fecha de introducción y observación.
- PROCESO ADMINISTRATIVO exige fecha del proceso y observación.
- Las fechas administrativas/laborales condicionales no admiten fechas futuras.

## Código y descripción de cargo
- Se elimina del formulario la selección desde el catálogo institucional de cargos.
- Código de cargo pasa a ser de introducción manual, obligatorio, en mayúsculas, solo letras/números y máximo 6 caracteres.
- Descripción del cargo pasa a ser de introducción manual, obligatoria y normalizada a mayúsculas.
- Se elimina de la pantalla principal de Personal el bloque de administración del catálogo de cargos.
- El backend deja de exigir que el código exista en StaffPositionCatalog, preservando esa tabla solo por compatibilidad con datos/versiones previas.

## Ficha y listados
- La ficha del trabajador muestra la condición laboral y los datos condicionales correspondientes.
- El listado de Personal agrega una columna de condición laboral separada del estado técnico ACTIVO/INACTIVO del registro.

## Base de datos
- Se agregan los enums `EmploymentCondition` e `IncapacityExecutor`.
- Se agregan campos aditivos a `Staff` para reposos, incapacidad, jubilación y proceso administrativo.
- No se eliminan registros existentes.
