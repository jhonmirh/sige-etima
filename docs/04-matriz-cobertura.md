# Matriz de cobertura de la narrativa

Leyenda: **Completo** = usable de extremo a extremo; **Parcial** = existe modelo/API o UI pero faltan flujos; **Base** = estructura preparada, no debe considerarse terminado.

| Requerimiento | Estado V2.0.1 | Implementación |
|---|---|---|
| Ficha completa del alumno | **Completo** | `Student`, alta/edición/ficha integral Next.js |
| Edad automática | **Completo** | Derivada de `birthDate`, no se persiste una edad fija |
| Estado → municipio → parroquia | **Parcial** | Modelo/API/selects listos; seed aún requiere catálogo completo de municipios/parroquias |
| Antropometría | **Completo** | `AnthropometricRecord`, captura m/cm y kg/g, histórico |
| Tallas camisa/pantalón/zapato | **Completo** | Catálogo de prendas y validación zapato 20–46 |
| Representantes múltiples | **Completo** | `Representative` + relación M:N + UI |
| Aporte por representante | **Completo** | `Contribution` único por representante/año + UI |
| Referencia de emergencia | **Completo** | `EmergencyContact` + UI |
| Documentos consignados | **Completo base** | Checklist y observaciones; carga binaria de archivos queda para endurecimiento documental |
| Profesores/personal | **Parcial** | `Staff`, `StaffQualification`; UI completa pendiente |
| Año, sección, prócer | **Parcial** | `AcademicYear`, `Section.name`; administración completa pendiente |
| N° lista fijo | **Parcial** | `Enrollment.listNumber` + lógica de cierre; UI de operación pendiente de ampliar |
| Inscritos tardíos al final | **Parcial** | `isLateEnrollment` + secuencia máxima |
| Retiros conservan posición | **Parcial** | `Withdrawal`, no se borra matrícula |
| Planes 31059/41049 | **Parcial** | Seed + configuración dinámica; editor administrativo pendiente |
| 3 lapsos, 2–5 evaluaciones | **Parcial** | `PedagogicalLapse`, `Assessment`; UI completa pendiente |
| Primera/segunda forma | **Parcial** | `AssessmentAttempt.form`; UI completa pendiente |
| Inasistente I | **Parcial** | `AttendanceStatus.INASISTENTE` |
| Orientación A/B/C/D | **Parcial** | Motor de conversión |
| Pendiente Oct/Dic/Feb/Mar | **Base** | Modelo de 4 oportunidades |
| Revisión dos formas | **Base** | `ReviewAttempt` |
| Regular/MP/Repitiente | **Parcial** | Recalculo por fallos |
| Retirado/Retirado Modificado | **Parcial** | Cálculo por primeros 30 días |
| Graduado/Inactivo | **Parcial** | Operaciones administrativas base |
| Grupo estable Media General | **Parcial** | `StableGroup` con validación de modalidad |
| Dashboard | **Parcial** | `/reports/dashboard` + UI básica |
| Nóminas/estadísticas | **Parcial** | Servicio de reportes + XLSX base; centro completo pendiente |
| Constancia estudio/trabajo | **Parcial** | PDFKit, endpoints PDF; ajustes de formato/UI pendientes |
| Claro/oscuro, azul marino | **Completo** | Tema CSS + toggle |
| JWT persistente | **Completo base** | Access token + refresh cookie |
| Auditoría | **Completo base** | `AuditLog` en operaciones de escritura |
