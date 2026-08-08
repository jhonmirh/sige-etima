# SIGE-ETIMA v1.0.4 - Correcciones de arranque local

Esta versión consolida las correcciones aplicadas durante la instalación local:

- Prisma: enums del schema escritos en sintaxis multilínea válida.
- Frontend: helper `api<T = any>` para evitar errores de TypeScript en llamadas sin tipo explícito.
- Backend: Docker inicia NestJS desde `dist/src/main.js`, que es la ruta generada por la configuración actual.
- Backend: `cookie-parser` se importa con sintaxis CommonJS compatible (`import * as cookieParser`).
- Se conserva PostgreSQL + Prisma + NestJS + Next.js bajo Docker Compose.

## Arranque

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Frontend: http://localhost:3000  
API/Swagger: http://localhost:4000/api/docs
