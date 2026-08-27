# V2.0.1 — Fase 1: Estudiantes y Representantes

Esta versión amplía la base v1.0.4 y convierte **Estudiantes + Representantes** en el primer bloque funcional de extremo a extremo.

## Frontend Next.js

### Estudiantes
- listado con búsqueda y filtro Activos/Inactivos/Todos;
- alta y edición con formulario por secciones;
- nacionalidad, cédula, cédula escolar, nombres, apellidos, sexo y estado civil;
- teléfono y correo;
- fecha y lugar de nacimiento con edad calculada;
- estructura de estado/municipio/parroquia preparada para nacimiento y residencia;
- dirección completa;
- datos de madre, padre y convivencia;
- grupo sanguíneo, discapacidad, informe médico y alergias;
- plantel de procedencia/destino y observaciones;
- ficha integral con pestañas;
- activación/inactivación lógica;
- histórico antropométrico;
- contactos de emergencia;
- control de recaudos documentales;
- trayectoria de matrícula;
- vinculación de representantes existentes.

### Representantes
- menú y módulo independiente;
- listado, búsqueda y filtro de estado;
- alta, consulta, edición e inactivación lógica;
- datos personales, contacto, profesión, trabajo y banco;
- vinculación con uno o múltiples estudiantes;
- representante principal y convivencia;
- autorización/parentesco;
- aporte único por representante y año escolar;
- histórico de aportes.

## Backend NestJS
- DTOs validados para altas y modificaciones;
- CRUD funcional de estudiantes y representantes;
- controles de duplicidad de cédula/cédula escolar;
- validación de consistencia geográfica cuando existen municipio/parroquia;
- endpoints de antropometría, emergencia y documentos;
- asociación/desasociación estudiante-representante;
- exclusividad de representante principal por estudiante;
- aporte anual único por representante;
- acceso restringido a ADMIN, DIRECTOR y SECRETARIA para estos módulos sensibles;
- auditoría global existente sobre operaciones de escritura.

## PostgreSQL / Prisma
Se agregaron o reforzaron:
- `Student.active`;
- `Student.maritalStatus`;
- geografía de nacimiento y residencia;
- detalle de discapacidad;
- plantel de procedencia;
- unicidad de cédula y cédula escolar;
- `Representative.active`;
- campos ampliados de `EmergencyContact`;
- metadatos de `StudentDocument`.

El contenedor API ejecuta migraciones versionadas al iniciar. Las bases heredadas de la etapa que usaba `prisma db push` se verifican antes de registrar la migración base, sin borrar ni reconstruir los datos existentes.

## Punto aún pendiente dentro de geografía
El modelo, API y selects dependientes están listos, pero el seed actual solo incorpora las entidades federales. El catálogo completo oficial/validado de municipios y parroquias debe cargarse antes de declarar esta parte cerrada al 100 %.

## Comandos de actualización local
Después de copiar esta versión sobre `C:\sige-etima`:

```powershell
cd C:\sige-etima
docker compose down
docker compose build api web
docker compose up -d
docker compose ps
```

No ejecutar `docker compose down -v`, ya que eliminaría el volumen local de PostgreSQL.
