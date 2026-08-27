# SIGE-ETIMA V2.2.2.11 — Estabilización técnica y seguridad

Bloque de estabilización acumulativo sobre V2.2.2.10. No modifica las reglas académicas ni la interfaz de Notas.

## Correcciones

- Se configura Jest con `ts-jest` para ejecutar correctamente las pruebas TypeScript del API.
- Las pruebas académicas ahora validan la implementación real de `GradingService` en lugar de repetir fórmulas dentro del propio test.
- Se agregan casos para inasistencias opcionales: vacío o nulo, enteros positivos y rechazo de cero, negativos, decimales, letras y símbolos.
- Se agregan pruebas de contención para los logos usados en constancias y reportes.
- Se declara `express` y `@types/express` como dependencias directas del API.
- Se incorpora `package-lock.json` para instalaciones reproducibles.

## Seguridad

- Login y renovación de sesión quedan limitados a 20 solicitudes por cada 15 minutos y dirección IP.
- En producción, los secretos JWT de acceso y renovación son obligatorios y deben tener al menos 32 caracteres.
- La cookie de renovación usa automáticamente `Secure` cuando `NODE_ENV=production`.
- La imagen Docker del API establece `NODE_ENV=production` después de compilar.
- Las rutas de logos institucionales se resuelven mediante ruta real y solo se aceptan archivos dentro de `apps/web/public`, impidiendo recorridos con `../` y enlaces fuera del directorio permitido.

## Verificación

- API NestJS: compilación correcta.
- Web Next.js: compilación y generación de 29 rutas correctas.
- Jest: 4 suites y 39 pruebas aprobadas.
- Fallow: sin archivos huérfanos, importaciones no resueltas, dependencias no declaradas, ciclos o colisiones de rutas.
- Fallow Security: sin candidatos confirmados; las superficies restantes fueron revisadas manualmente.

## Deuda técnica identificada

- Persisten componentes y servicios históricos de alta complejidad, especialmente `grades/page.tsx`, configuración de matrícula, formularios de personal y reportes.
- `class-transformer` aparece como no importada para el análisis sintáctico, pero se conserva porque es dependencia par requerida por NestJS cuando `ValidationPipe` usa transformación.
- npm audit mantiene 7 avisos (4 altos y 3 moderados) cuya corrección automática exige cambios mayores o incompatibles en Next/PostCSS, Prisma/deepmerge-ts y ExcelJS/uuid. No se aplicó `--force`; deben resolverse en una migración controlada.
