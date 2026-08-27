# Auditoría técnica SIGE-ETIMA V2.2.2.11

Fecha: 27 de agosto de 2026

## Resultado ejecutivo

La versión V2.2.2.10 recibida compila correctamente en sus dos workspaces. Se corrigió la infraestructura de pruebas, se reforzó la autenticación y se protegió la resolución de recursos usados por los reportes. El bloque estabilizado se identifica como V2.2.2.11.

## Verificaciones aprobadas

- API NestJS: compilación correcta.
- Web Next.js 15.5.24: compilación, validación de tipos y generación de 29 rutas correctas.
- Jest: 4 suites y 39 pruebas aprobadas.
- Fallow: 0 archivos huérfanos, 0 importaciones no resueltas, 0 dependencias no declaradas, 0 ciclos y 0 colisiones de rutas.
- Las pruebas cubren calendario escolar, decisión académica, conversión de calificaciones, validación de inasistencias y contención de rutas de logos.

## Correcciones incorporadas

- Configuración de Jest y ts-jest.
- Pruebas sobre la implementación real de calificaciones.
- Casos válidos e inválidos de inasistencias por lapso.
- Límite de solicitudes para login y renovación de sesión.
- Secretos JWT obligatorios y de al menos 32 caracteres en producción.
- Cookie de renovación segura automáticamente en producción.
- NODE_ENV=production en la imagen Docker del API.
- Contención por ruta real para impedir que un logo institucional lea archivos fuera de apps/web/public.
- Dependencias directas de Express y archivo de bloqueo reproducible.

## Línea base Fallow

- Puntuación de salud: 29,4/100 (F).
- Duplicación aproximada: 10,24 %.
- Archivos analizados: 67.
- Funciones analizadas: 1.231.
- Funciones sobre los umbrales configurados: 221.
- Exportaciones detectadas sin consumidor externo: 21.
- Dependencia marcada sintácticamente como no usada: class-transformer. Se conserva porque NestJS la exige como dependencia par para ValidationPipe con transformación.

La calificación baja se concentra en complejidad histórica y falta de cobertura, no en errores de compilación. Los mayores focos son grades/page.tsx, configuración y creación de matrícula, formularios de personal/estudiantes y reports.ts.

## Avisos de dependencias

npm audit informa 7 avisos: 4 altos y 3 moderados, relacionados con Prisma/deepmerge-ts, Next/PostCSS y ExcelJS/uuid. No se ejecutó npm audit fix --force porque las propuestas requieren cambios mayores, sustituciones incompatibles o una versión anterior de ExcelJS.

La exposición efectiva es menor que el conteo bruto en varios casos: Prisma y PostCSS se usan principalmente en generación/compilación, y la aplicación no invoca directamente las variantes de uuid afectadas. Aun así, deben tratarse en una migración controlada.

## Próximos bloques recomendados

1. Sustituir los Body any del módulo administrativo por DTOs validados y limitar campos editables.
2. Reemplazar prisma db push durante el arranque por migraciones versionadas para producción.
3. Preparar y probar la migración de Next, Prisma y el generador Excel sin usar actualizaciones forzadas.
4. Dividir grades/page.tsx en componentes, hooks y reglas reutilizables con pruebas.
5. Consolidar las pantallas duplicadas de vinculación estudiante-representante.
6. Ampliar pruebas de servicios de matrícula, notas, cierres y permisos por rol.
