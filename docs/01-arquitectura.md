# Arquitectura técnica

## Decisión principal
Se eligió **NestJS** como backend por su estructura modular, guardas, inyección de dependencias, validación, integración limpia con Prisma y facilidad para separar dominios si en el futuro la institución necesita escalar a servicios independientes.

## Capas
- **Next.js:** interfaz, navegación por rol, modo claro/oscuro, formularios, consultas y reportes.
- **NestJS REST API:** reglas escolares, autorización, transacciones y auditoría.
- **PostgreSQL:** fuente única de verdad, con claves foráneas, índices y restricciones únicas.
- **Prisma:** modelo tipado, migraciones y seed.

## Módulos de dominio
Auth, Estudiantes, Representantes, Matrícula, Académico/Planes, Personal, Notas, Grupos, Administración, Reportes.

## Seguridad
- Access JWT corto (15 min por defecto).
- Refresh token en cookie HttpOnly/SameSite Strict y hash en DB.
- RBAC: ADMIN, DIRECTOR, SECRETARIA, DOCENTE.
- `helmet`, CORS explícito, validación DTO, contraseñas bcrypt cost 12.
- Auditoría de POST/PUT/PATCH/DELETE.
- Recomendado producción: HTTPS, reverse proxy, backups cifrados, rate limiting centralizado, rotación de secretos y MFA para Dirección.

## Evolución
El diseño de planes de estudio es parametrizable: no hay columnas fijas por materia. Un administrador puede crear una nueva versión de plan y asignar materias por grado sin alterar expedientes históricos.
