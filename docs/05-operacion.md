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
El contenedor API ejecuta `prisma db push` y `prisma seed` al arrancar. Para un entorno controlado de producción, sustituir `db push` por migraciones versionadas:

```bash
npm run prisma:migrate -w @sige/api
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
