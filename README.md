# Star Wars Movies API

Backend en NestJS + MongoDB para gestionar películas. El catálogo inicial se importa desde la
[API pública de Star Wars (SWAPI)](https://www.swapi.tech/) y después los administradores pueden
crear, editar y eliminar películas. Autenticación con JWT y autorización por roles.

- **Swagger:** `http://localhost:3000/api` (OpenAPI JSON en `/api-json`)
- **Stack:** NestJS 11 · Mongoose 9 · JWT · Swagger · `@nestjs/schedule` · Jest + Supertest
- **Versión:** ver [CHANGELOG.md](CHANGELOG.md) · se expone en `GET /health` y en Swagger

---

## Inicio rápido

### Con Docker

```bash
cp .env.example .env     # completar JWT_SECRET (ver abajo)
docker compose up --build
```

### Local

Requiere Node 22+ y una MongoDB accesible.

```bash
cp .env.example .env     # completar JWT_SECRET y, si hace falta, MONGODB_URI
npm install
npm run start:dev
```

Generar un secreto: `openssl rand -base64 48`. **La app no arranca sin `JWT_SECRET`** (mínimo 16
caracteres): no existe un valor por defecto a propósito.

### Primer uso

1. Crear el primer administrador con el **seed** (usa `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`;
   es idempotente y nunca modifica una cuenta existente):

   ```bash
   npm run seed                                  # local
   docker compose run --rm api node dist/seed    # con Docker
   ```

2. `POST /auth/login` con esas credenciales → token de admin.
3. `POST /movies/sync` con ese token → importa las 6 películas de SWAPI.
4. `POST /auth/register` crea usuarios; el rol se elige en el body (ver advertencia en
   [Autenticación y roles](#autenticación-y-roles)).

En Swagger, usar el botón **Authorize** con `access_token`.

---

## Variables de entorno

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `MONGODB_URI` | sí | – | Cadena de conexión a MongoDB |
| `MONGODB_CONNECT_TIMEOUT_MS` | no | `5000` | Cuánto esperar a MongoDB al arrancar (mín. 100) |
| `DB_FALLBACK_ENABLED` | no | `true` | Si MongoDB no responde, arrancar igual en [modo degradado](#modo-degradado-sin-base-de-datos). `false` aborta el arranque |
| `JWT_SECRET` | sí | – | Secreto de firma, mínimo 16 caracteres |
| `JWT_EXPIRES_IN` | no | `1h` | Vigencia del token (`15m`, `1h`, `7d`…) |
| `PORT` | no | `3000` | Puerto HTTP |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | para el seed | – | Primer admin. Se piden **juntas o ninguna** |
| `SWAPI_BASE_URL` | no | `https://www.swapi.tech/api` | Base de SWAPI |
| `SWAPI_RETRY_ATTEMPTS` | no | `3` | Intentos totales contra SWAPI (incluye el primero) |
| `SWAPI_RETRY_DELAY_MS` | no | `500` | Espera inicial entre reintentos; se duplica en cada uno |
| `SYNC_CRON` | no | `0 3 * * *` | Expresión cron del sync programado |
| `SYNC_CRON_ENABLED` | no | `true` | `false` desactiva el cron (el endpoint sigue funcionando) |

Todo se valida al arrancar ([env.validation.ts](src/config/env.validation.ts)); si algo falta o es
inválido, el proceso falla con un mensaje claro en vez de arrancar a medias.

---

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Alta de usuario (el rol se elige en el body), devuelve JWT |
| `POST` | `/auth/login` | Público | Login, devuelve JWT |
| `GET` | `/movies` | Autenticado | Listado paginado (`?page=1&limit=20`, máx. 100) |
| `GET` | `/movies/:id` | Autenticado (usuario o admin) | Detalle |
| `POST` | `/movies` | **Admin** | Crear |
| `PATCH` | `/movies/:id` | **Admin** | Actualizar |
| `DELETE` | `/movies/:id` | **Admin** | Eliminar |
| `POST` | `/movies/sync` | **Admin** | Sincronizar desde SWAPI |
| `GET` | `/health` | Público | Liveness, estado de la base (`ok` / `degraded`) y versión |

Sin token → `401`. Con token pero sin el rol requerido → `403`. Id mal formado → `400`. Inexistente → `404`.

> **Desvío respecto de la consigna.** El enunciado dice que el detalle es solo para "Usuarios
> Regulares". Decidí permitirlo también a los admins: un admin que gestiona el catálogo necesita
> poder verlo. Los usuarios sin autenticar siguen sin acceso. Es un cambio de una línea
> (`@Roles(Role.USER)` en `get`) si se prefiere la lectura literal.

---

## Autenticación y roles

- JWT firmado con `JWT_SECRET`; el payload es `{ sub, email, role }`.
- Dos guards globales, en este orden: `JwtAuthGuard` (autentica) y `RolesGuard` (autoriza). **Todo
  es privado por defecto**; las rutas públicas se marcan explícitamente con `@Public()`. Así, un
  endpoint nuevo olvidado no queda abierto.
- Los endpoints de escritura declaran `@Roles(Role.ADMIN)`.
- Contraseñas con bcrypt (12 rondas); mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.
- `POST /auth/register` acepta un `role` opcional (`user` | `admin`, por defecto `user`). Un valor
  inexistente devuelve `400`.

> ⚠️ **Esto tiene que cambiar antes de producción.** Permitir que quien se registra elija su propio
> rol significa que **cualquiera puede darse de alta como admin**. Se dejó así a propósito en este
> challenge para poder ejercitar el acceso por roles sin pasos extra, y está marcado con
> `TODO(security)` en [auth.service.ts](src/auth/application/auth.service.ts) y en
> [register.dto.ts](src/auth/dto/register.dto.ts). Lo correcto es: el registro público siempre crea
> `user`, y los admins salen del seed o de un endpoint solo para admins. El test e2e
> "lets the client choose its role at sign-up" documenta el comportamiento actual y debe invertirse
> al corregirlo.

**Trade-off asumido: el rol vive en el token.** Evita una consulta a la base por request, pero un
cambio de rol (o una baja) no se refleja hasta que el token expira. Por eso la vigencia por defecto
es corta (`1h`). Si hiciera falta revocación inmediata, habría que consultar el usuario en el guard
o agregar refresh tokens.

---

## Modo degradado (sin base de datos)

Si MongoDB no responde al arrancar, **el backend inicia igual** y se puede listar con los datos propios
de la API en lugar de caerse:

```bash
$ curl localhost:3000/health
{"status":"degraded","database":"memory","version":"1.0.0"}
```

- Los repositorios pasan a ser **en memoria** y arrancan precargados con un snapshot de las 6 películas
  de SWAPI incluido en el código ([films.snapshot.ts](src/movies/infrastructure/films.snapshot.ts)),
  con la misma forma que produce el sync. Por eso `GET /movies` y `GET /movies/:id` funcionan sin red.
- Autenticación, roles, validaciones, paginación y el sync (si hay red hacia SWAPI) siguen funcionando.
- **Es volátil:** usuarios y cambios se pierden al reiniciar, y no se comparten entre réplicas. Se avisa con
  un `WARN` al arrancar y con `status: "degraded"` en `/health`.
- `npm run seed` se niega a correr (escribiría en una memoria que muere al terminar el script).
- La decisión se toma **una sola vez, al arrancar**. Si Mongo vuelve después, hay que reiniciar para
  volver a usarlo. Si Mongo se cae con la app ya en modo normal, `/health` pasa a `mongo-disconnected`.
- El arranque tarda lo que dure `MONGODB_CONNECT_TIMEOUT_MS` (5 s por defecto) cuando la base no está.
- **En producción conviene `DB_FALLBACK_ENABLED=false`:** un fallback silencioso podría esconder una base
  mal configurada y perder escrituras sin que nadie lo note. El snapshot se regenera con
  `npm run snapshot:update`.

---

## Sincronización con SWAPI

Se ejecuta por `POST /movies/sync` (admin) y por un **cron** (`SYNC_CRON`, por defecto 03:00 diario).
Ambos usan el mismo servicio.

- **Se copian todos los campos de SWAPI** (título, episodio, crawl, director, productor, fecha,
  personajes, planetas, naves, vehículos, especies, url, fechas de creación/edición).
- **Idempotente:** upsert por `swapiId` (el `uid` de SWAPI), con índice único parcial.
- **El sync pisa lo editado a mano:** SWAPI es la fuente de verdad, así que editar una película
  sincronizada no es permanente; el siguiente sync restaura los valores de SWAPI.
- **Las películas creadas a mano no se tocan:** llevan `isManual: true` y `swapiId: null`, y el
  sync solo busca por `swapiId`. Las sincronizadas llevan `isManual: false`.
- **Reintentos:** ante fallas transitorias (red, timeout, `408`, `429`, `5xx`) se reintenta con
  backoff exponencial (`SWAPI_RETRY_ATTEMPTS` / `SWAPI_RETRY_DELAY_MS`; por defecto 3 intentos,
  esperando 500 ms y 1 s). Las fallas permanentes (`4xx`, una página HTML con `200`, un payload
  inesperado) no se reintentan porque no se van a resolver solas.
- **Atómico respecto de SWAPI:** se descarga todo el catálogo *antes* de escribir. Si SWAPI sigue
  fallando tras los reintentos → `502` y la base queda intacta.
- **Sin ejecuciones superpuestas:** un segundo sync mientras hay uno en curso devuelve `409`.
  Ojo: el candado es por proceso. Con varias réplicas, dejar `SYNC_CRON_ENABLED=true` en una sola.
- Una película **eliminada** que existe en SWAPI se vuelve a crear en el siguiente sync. Es el
  comportamiento esperable de una fuente de verdad externa; si se quisiera evitar, habría que
  guardar un registro de borrados.

---

## Arquitectura

Hexagonal liviana. La regla de dependencias es `controller/dto → application → domain ← infrastructure`:
el dominio no importa ningún paquete, y la aplicación no conoce Mongoose, Express ni la capa de infraestructura
(solo usa los decoradores de inyección de `@nestjs/common`). **Está hecha cumplir por un test**
([architecture.spec.ts](src/architecture.spec.ts)), que además exige que cada repositorio de Mongo tenga su
gemelo en memoria.

```
src/
├── auth/        domain (puertos) · application · infrastructure (Mongoose, bcrypt, JWT) · guards
├── movies/      domain · application (MoviesService) · infrastructure · dto · controller
├── swapi/       puerto SwapiPort + adapter HTTP
├── sync/        SyncMoviesService · controller · scheduler (cron)
├── persistence/ decide al arrancar entre MongoDB y memoria (modo degradado)
├── common/      errores de dominio, filtro HTTP, pipe de ObjectId
└── config/      validación de variables de entorno
```

- **Puertos y adapters:** `UserRepositoryPort`, `MovieRepositoryPort`, `SwapiPort`,
  `PasswordHasherPort`, `TokenGeneratorPort` se inyectan por token; los servicios dependen de
  interfaces, no de implementaciones.
- **Errores de dominio** (`NotFoundError`, `ConflictError`…) se lanzan desde la capa de aplicación
  y un único `DomainExceptionFilter` los traduce a HTTP. Los servicios no importan excepciones de Nest.
- **Un servicio por módulo** en lugar de un caso de uso por operación: menos archivos, la misma
  testabilidad, que es lo que aporta el patrón a este tamaño.

---

## Tests

```bash
npm test            # unitarios
npm run test:cov    # con cobertura
npm run test:e2e    # end-to-end
npm run check       # lint + tipos + unitarios + e2e (lo que debe estar en verde antes de entregar)
```

- **Unitarios (77):** servicios con puertos mockeados, **ambos guards** (autenticación y roles),
  seed, sync (alta, pisado de ediciones, películas manuales, caída de SWAPI, concurrencia), adapter
  de SWAPI (mapeo y reintentos con backoff), scheduler, validación de entorno, repositorios en memoria, changelog y la **regla de arquitectura**.
- **E2E (32):** la aplicación completa por HTTP con Supertest, contra una **MongoDB real en memoria**
  (`mongodb-memory-server`); solo SWAPI está simulado. Cubre registro/login, matriz de acceso
  (sin token / usuario / admin sobre cada endpoint), CRUD, validaciones, paginación, seed y el sync completo. Dos suites aparte cubren MongoDB caído: arranca en modo
  degradado y sirve datos, y con `DB_FALLBACK_ENABLED=false` se niega a arrancar.

Notas del e2e:
- La primera ejecución descarga un binario de `mongod` (se cachea en `node_modules/.cache`), así que
  necesita red.
- El script usa `--experimental-vm-modules`: el driver de MongoDB carga el módulo `os` con
  `import()` dinámico, que Jest en CommonJS rechaza; sin el flag el handshake con Mongo falla.

---

## Preparado para desplegar

No está desplegado, pero está listo para hacerlo:

- `Dockerfile` multi-stage, con usuario no root y `HEALTHCHECK` sobre `/health`.
- `docker-compose.yml` con MongoDB y healthchecks; no expone el puerto de la base.
- Toda la configuración por entorno; sin secretos por defecto.
- `GET /health` para el balanceador / orquestador.

Para un PaaS: definir `DB_FALLBACK_ENABLED=false`, `MONGODB_URI` (p. ej. MongoDB Atlas) y `JWT_SECRET`, apuntar el health check
a `/health`, y ejecutar una vez `node dist/seed` (con `ADMIN_EMAIL` y `ADMIN_PASSWORD`) para crear
el primer admin.

> La imagen Docker no se probó en el entorno donde se desarrolló (el daemon no estaba disponible);
> la app sí se probó compilada (`npm run build && node dist/main`) contra la SWAPI real.

---

## Versionado y releases

- **Versionado Semántico** (`MAYOR.MENOR.PARCHE`). La fuente única es `version` en `package.json`; de ahí sale
  la versión que muestran `GET /health` y Swagger.
  - **major**: rompe un contrato (ruta, campo de respuesta, rol requerido, formato de error, variable de entorno obligatoria nueva).
  - **minor**: agrega algo sin romper lo existente.
  - **patch**: solo correcciones.
- **[CHANGELOG.md](CHANGELOG.md)** sigue *Keep a Changelog*. Cada cambio visible para quien usa la API se
  anota en `## [Unreleased]` **en el mismo commit/PR que lo introduce**.
- **Commits** con [Conventional Commits](https://www.conventionalcommits.org/es/) (`feat:`, `fix:`,
  `refactor:`, `test:`, `docs:`, `chore:`; `!` para cambios incompatibles).
- **Publicar una versión:**

  ```bash
  npm run release:patch   # o release:minor / release:major
  git push --follow-tags
  ```

  Qué hace `release:*`: valida que `[Unreleased]` tenga entradas (**antes** de tocar nada, así un
  release que no puede salir no deja el repo a medias) → corre `npm run check` → sube `version` → mueve
  `[Unreleased]` a `## [x.y.z] - fecha` → crea el commit `chore(release): vx.y.z` (con el changelog dentro) y el tag `vx.y.z`.
  Requiere árbol de trabajo limpio.
- `changelog.spec.ts` falla si `package.json` y el changelog se desincronizan.
- **Primera publicación:** la versión `1.0.0` ya está en el changelog. Tras el commit inicial, el tag se
  crea a mano una única vez: `git tag v1.0.0`.

---

## Desarrollo con Claude Code (agentes)

El repo trae contexto y agentes para extenderlo sin romper la arquitectura. [CLAUDE.md](CLAUDE.md) documenta
las reglas; los agentes están en [.claude/agents/](.claude/agents/):

| Agente | Para qué |
|---|---|
| `hexagonal-feature` | Implementa un módulo/feature nuevo de punta a punta: dominio, aplicación, repos Mongo **y** memoria, controller con Swagger, tests, changelog |
| `external-integration` | Agrega una API externa como puerto + adapter, con timeout, reintentos y mapeo de errores (el modelo es SWAPI) |
| `test-writer` | Escribe tests unitarios y e2e de un módulo existente, con verificación por mutación |
| `hexagonal-reviewer` | Revisor de **solo lectura**: arquitectura, gemelos de persistencia, roles, Swagger, changelog |
| `release-manager` | Completa el changelog, propone el nivel SemVer y deja listo el comando de release |

Atajo: `/new-feature <qué construir>` valida el pedido, delega en `hexagonal-feature` y pasa el resultado por
`hexagonal-reviewer`. Los permisos del proyecto ([.claude/settings.json](.claude/settings.json)) permiten
correr los checks sin pedir confirmación, pero **bloquean** `git push`, `npm publish` y `npm run release:*`:
publicar siempre lo decide una persona.

---

## Limitaciones conocidas

- **Solo películas.** La consigna habla de "películas y series", pero SWAPI no tiene series: sus
  recursos son `films`, `people`, `planets`, `species`, `starships` y `vehicles`. Si algún día las
  hubiera, serían el mismo documento con un campo `kind`, sin colección nueva.
- **Modo degradado volátil** (ver su sección): sirve datos, pero no es persistencia.
- **El rol se elige al registrarse** (ver advertencia en Autenticación y roles).
- Sin rate limiting en `/auth/*`.
- Sin revocación de tokens (ver trade-off de roles).
- La paginación es por `skip/limit`; para catálogos grandes convendría paginar por cursor.
- No hay unicidad por `episodeId`: un admin puede crear una película duplicada a mano.
# conexa
