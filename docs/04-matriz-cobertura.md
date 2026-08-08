# Matriz de cobertura de la narrativa

| Requerimiento | Implementación |
|---|---|
| Ficha completa del alumno | `Student`, UI Estudiantes |
| Edad automática | Derivada de `birthDate` en reportes/UI |
| Estado → municipio → parroquia | Tablas jerárquicas + endpoint `/academic/geography` |
| Antropometría | `AnthropometricRecord` |
| Tallas camisa/pantalón/zapato | Campos y validación zapato 20–46 |
| Representantes múltiples | `Representative` + relación M:N |
| Aporte por representante | `Contribution` único por representante/año |
| Referencia de emergencia | `EmergencyContact` |
| Documentos consignados | `StudentDocument` |
| Profesores/personal | `Staff`, `StaffQualification` |
| Año, sección, prócer | `AcademicYear`, `Section.name` |
| N° lista fijo | `Enrollment.listNumber` + cierre de nómina |
| Inscritos tardíos al final | `isLateEnrollment` + secuencia máxima |
| Retiros conservan posición | `Withdrawal`, no se borra matrícula |
| Planes 31059/41049 | Seed + configuración dinámica |
| 3 lapsos, 2–5 evaluaciones | `PedagogicalLapse`, `Assessment` |
| Primera/segunda forma | `AssessmentAttempt.form` |
| Inasistente I | `AttendanceStatus.INASISTENTE` |
| Orientación A/B/C/D | Motor de conversión |
| Pendiente Oct/Dic/Feb/Mar | Modelo de 4 oportunidades |
| Revisión dos formas | `ReviewAttempt` |
| Regular/MP/Repitiente | Recalculo por fallos |
| Retirado/Retirado Modificado | Cálculo por primeros 30 días |
| Graduado/Inactivo | Operaciones administrativas |
| Grupo estable Media General | `StableGroup` con validación de modalidad |
| Dashboard | `/reports/dashboard` + UI |
| Nóminas/estadísticas | Servicio de reportes + XLSX base |
| Constancia estudio/trabajo | PDFKit, endpoints PDF |
| Claro/oscuro, azul marino | Tema CSS + toggle |
| JWT persistente | Access + refresh cookie |
| Auditoría | `AuditLog` |
