# Instalación y operación

## Requisitos
Docker Desktop / Docker Engine + Compose.

## Despliegue
1. Copiar `.env.example` a `.env`.
2. Cambiar contraseñas y secretos JWT.
3. Ejecutar `docker compose up --build -d`.
4. Confirmar `docker compose ps`.
5. Entrar a `http://localhost:3000`.

## Base de datos
El contenedor API ejecuta migraciones versionadas con `prisma migrate deploy` y luego el seed idempotente. Ya no usa `prisma db push` durante el arranque.

Para instalaciones existentes creadas por versiones anteriores, el arranque comprueba primero que la estructura real coincida exactamente con `schema.prisma`. Solo entonces registra la migración base como aplicada, sin reconstruir tablas ni borrar datos. Si detecta diferencias, el API se detiene y solicita revisión manual para proteger el volumen PostgreSQL.

En desarrollo, las nuevas migraciones se crean con:

```bash
npm run db:migrate
```

En despliegues y CI se aplican únicamente las migraciones pendientes:

```bash
npm run db:migrate:deploy
```

## Backups PostgreSQL
```bash
docker compose exec db pg_dump -U sige -Fc sige_etima > sige_etima.backup
```

Restauración:
```bash
docker compose exec -T db pg_restore -U sige -d sige_etima --clean < sige_etima.backup
```

## Recomendaciones de producción
- HTTPS obligatorio.
- PostgreSQL fuera de exposición pública.
- Backups diarios + retención mensual.
- Prueba de restauración trimestral.
- MFA para Dirección/Administrador.
- Almacenamiento de documentos en objeto privado (S3/MinIO) con URLs firmadas.
- Centralizar logs y alertas.
