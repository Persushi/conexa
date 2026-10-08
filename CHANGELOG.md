# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[Versionado Semántico](https://semver.org/lang/es/). Cómo se publica una versión: ver
[Versionado y releases](README.md#versionado-y-releases) en el README.

## [Unreleased]

## [1.0.0] - 2026-10-08

Primera versión.

### Agregado
- Autenticación con JWT (`POST /auth/register`, `POST /auth/login`) con rol en el token.
- Autorización por roles (`user` / `admin`) con guards globales: todo es privado salvo `@Public()`.
- CRUD de películas con paginación: lectura para cualquier usuario autenticado, escritura solo admin.
- Sincronización con SWAPI por endpoint (`POST /movies/sync`, admin) y por cron configurable.
  Upsert por `swapiId`, copia todos los campos, reintentos con backoff exponencial ante fallas
  transitorias, sin escrituras parciales si SWAPI falla y candado contra ejecuciones simultáneas.
- Las películas creadas a mano llevan `isManual: true` y el sync no las modifica.
- Script de seed del primer administrador (`npm run seed`).
- Modo degradado: si MongoDB no está disponible al arrancar, la app inicia igual sobre
  repositorios en memoria precargados con un snapshot de SWAPI. Se desactiva con
  `DB_FALLBACK_ENABLED=false`.
- `GET /health` con estado de la base de datos y versión de la API.
- Documentación Swagger en `/api`.
- Tests unitarios y end-to-end (contra MongoDB real en memoria), incluido el modo degradado.
- Dockerfile multi-stage y `docker-compose.yml` con MongoDB.
- Versionado semántico con `package.json` como fuente única y changelog que se promueve solo al
  publicar (`npm run release:*`).
- Agentes de Claude Code y `CLAUDE.md` para extender el proyecto respetando la arquitectura
  hexagonal, más un test que hace cumplir la regla de dependencias.

### Seguridad
- **Pendiente antes de producción:** `POST /auth/register` permite elegir el rol, por lo que
  cualquiera puede registrarse como admin. Está marcado con `TODO(security)` y debe eliminarse.
