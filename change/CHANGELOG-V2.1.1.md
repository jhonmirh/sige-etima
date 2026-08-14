# SIGE-ETIMA V2.1.1 — Salud, vivienda e hijos del personal

## Personal
- Tipo de sangre: A+, A-, B+, B-, AB+, AB-, O+, O-.
- Vivienda: PROPIA, ALQUILADA o PRESTADA.
- Para vivienda PROPIA se puede indicar si necesita arreglo y describir el tipo de reparación requerida.
- Enfermedad declarada con descripción obligatoria cuando corresponde.
- Operación requerida con descripción obligatoria cuando corresponde.
- Uso de lentes con descripción obligatoria de la condición visual cuando corresponde.
- La descripción del arreglo requerido puede copiarse desde la ficha del personal.

## Hijos y carga familiar
- Nuevo registro individual de hijos del personal.
- Nombres y apellidos completos.
- Cédula opcional.
- Fecha de nacimiento obligatoria para calcular la edad.
- Conteos automáticos: total, menores o iguales a 21 años y mayores de 21 años.
- Indicador de si está estudiando.
- Nivel educativo seleccionable según la estructura usada por SIGE-ETIMA: Educación Inicial, Primaria 1°–6°, Media General 1°–5°, Media Técnica 1°–6°, TSU, Pregrado, Especialización, Maestría, Doctorado y Otro.
- Nombre de la institución educativa obligatorio cuando está estudiando.
- Enfermedad y descripción obligatoria cuando corresponde.
- Edición y eliminación controlada de hijos.
- El campo histórico `childrenCount` se sincroniza automáticamente con los registros individuales.

## Base de datos
- Nuevo enum `HousingTenure`.
- Nuevos campos de vivienda y salud en `Staff`.
- Nuevo modelo `StaffChild` relacionado con `Staff`.
- Cambios aditivos; no eliminan datos existentes.
