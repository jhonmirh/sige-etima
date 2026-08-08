# Modelo de datos — resumen

## Núcleo de personas
- `Student`: datos personales, nacimiento, familia, salud y convivencia.
- `Representative`: datos del representante, trabajo, teléfonos, cuenta bancaria.
- `StudentRepresentative`: relación muchos-a-muchos (un representante puede tener varios estudiantes).
- `EmergencyContact`: persona no familiar para emergencia.
- `Staff` + `StaffQualification`: profesores/personal y títulos.

## Expediente escolar
- `AcademicYear`, `StudyPlan`, `Subject`, `StudyPlanSubject`, `Section`, `Enrollment`.
- `AnthropometricRecord`: historial de talla/peso.
- `StudentDocument`: documentos consignados.
- `Withdrawal`: retiro sin alterar la nómina.
- `Contribution`: un aporte por representante por año escolar.

## Notas
- `TeacherAssignment`, `PedagogicalLapse`, `Assessment`, `AssessmentAttempt`, `LapseGrade`, `AnnualSubjectResult`.
- `PendingSubject`, `PendingOpportunity`, `PendingAttempt`, `ReviewAttempt`.

## Participación
- `StableGroup` y `StableGroupMembership`.

## Administración
- `Institution`, `User`, `AuditLog`, `GradingPolicy`.

El esquema completo está en `apps/api/prisma/schema.prisma`.
