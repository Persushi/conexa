# Star Wars Movies API — guía para agentes

Backend NestJS 11 + MongoDB (Mongoose 9) con arquitectura hexagonal. Lee este archivo completo
antes de tocar código. La referencia de cómo se ve una feature terminada es el módulo `src/movies/`.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run start:dev` | Levantar en desarrollo |
| `npm test` | Unitarios (incluye `architecture.spec.ts` y `changelog.spec.ts`) |
| `npm run test:e2e` | End-to-end. **Siempre por este script**: necesita `--experimental-vm-modules` |
| `npm run check` | Todo junto: lint sin `--fix`, tipos, unitarios y e2e. Es la definición de "terminado" |
| `npm run lint` | Lint **con `--fix`** (reescribe archivos) |
| `npm run seed` | Crea el primer admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| `npm run snapshot:update` | Regenera el snapshot de películas del modo degradado |
| `npm run release:patch\|minor\|major` | Publica una versión. **Solo si el usuario lo pide** |

## Regla de dependencias (la hace cumplir `src/architecture.spec.ts`)

```
controller / dto ──▶ application ──▶ domain ◀── infrastructure
```

| Capa | Qué contiene | Puede importar | NO puede importar |
|---|---|---|---|
| `domain/` | Entidades (interfaces), puertos, enums | Solo otros archivos de `domain/` y `common/errors` | **Ningún paquete**, ni Nest, ni mongoose |
| `application/` | Servicios con la lógica | `domain/`, `common/errors`, `@nestjs/common`, `@nestjs/config` | `infrastructure/`, `dto/`, controllers, `mongoose`, `express`, `@nestjs/swagger` |
| `infrastructure/` | Adapters: schemas, repos Mongo, repos memoria, clientes HTTP | `domain/`, `common/errors`, cualquier paquete | `application/`, `dto/`, controllers |
| `*.controller.ts`, `dto/` | Entrada HTTP, validación, Swagger | `application/`, `domain/` | — |

Si `architecture.spec.ts` falla, **corregí el código, nunca el test**.

## Convenciones de código

- **Un puerto por dependencia externa**, inyectado por `Symbol` definido en `src/injection-tokens.ts`.
  Los servicios reciben interfaces (`@Inject(TOKEN) private readonly x: XPort`), nunca clases concretas.
- **Errores**: la capa de aplicación lanza solo `NotFoundError`, `ConflictError`,
  `InvalidCredentialsError` o `UpstreamError` (`common/errors/domain.errors.ts`). El
  `DomainExceptionFilter` los traduce a HTTP. **Nunca** `HttpException` fuera de controllers/guards/pipes.
- **Persistencia dual**: la app arranca aunque Mongo no esté (`src/persistence/`). Por eso **cada repo de
  Mongo (`x.repository.ts`) necesita su gemelo `x.memory.repository.ts`** con el mismo contrato (incluidos
  los errores: *rechazar* la promesa, no lanzar síncrono). El módulo elige cuál usar con una factory sobre
  el token `PERSISTENCE`; copiá el patrón de `movies.module.ts`.
- **Mongoose**: los repos Mongo reciben el `Model` por constructor (sin `@InjectModel`) y se construyen con
  `modelFor()`. No parametrices `modelFor`/`Model<T>` con genéricos nuevos: en Mongoose 9 el compilador
  entra en recursión infinita y se queda sin memoria.
- **Auth**: guards globales. Todo es privado por defecto; `@Public()` abre una ruta y `@Roles(Role.ADMIN)`
  la restringe. No agregues guards por controller.
- **Respuestas**: devolvé una clase `XResponseDto implements X` (con `@ApiProperty`), nunca `as unknown as`.
- **Swagger** (obligatorio, es parte de la consigna): `@ApiTags`, `@ApiBearerAuth` si es privado,
  `@ApiOperation` con quién puede usarlo, y una `@Api*Response` con `description` por cada código posible
  (200/201/204, 400, 401, 403, 404, 409…).
- **IDs en rutas**: `@Param('id', ParseObjectIdPipe)`.
- **Config**: variables nuevas se validan en `src/config/env.validation.ts` y se documentan en
  `.env.example`, `docker-compose.yml` y la tabla del README. Nunca secretos por defecto.
- **TypeScript 6**: `types` está declarado a mano en `tsconfig.json`; `strictPropertyInitialization` está
  apagado para DTOs/schemas. Tests importan helpers desde `test/support/`.

## Receta para una feature nueva (módulo `foo`)

1. `foo/domain/foo.entity.ts` — interfaz. `foo/domain/foo.repository.port.ts` — puerto.
2. `foo/application/foo.service.ts` — lógica; lanza errores de dominio.
3. `foo/infrastructure/`: `foo.schema.ts`, `foo.repository.ts` (Mongo), `foo.memory.repository.ts`.
4. Token en `injection-tokens.ts`; `foo.module.ts` con la factory sobre `PERSISTENCE`.
5. `foo/dto/*` y `foo.controller.ts` con Swagger completo y `@Roles` donde corresponda.
6. Registrar `FooModule` en `app.module.ts`.
7. Tests: servicio (puertos mockeados), repo memoria, y e2e en `test/` (matriz sin token / usuario / admin,
   validaciones, 404, y el caso degradado si aplica).
8. `CHANGELOG.md` bajo `## [Unreleased]` y la tabla de endpoints del README.
9. `npm run check` en verde.

Para integrar un servicio externo (como SWAPI) seguí el agente `external-integration`.

## Git y versiones

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`; `!` o `BREAKING CHANGE:`
  para cambios incompatibles.
- **Todo cambio visible para quien usa la API se anota en `CHANGELOG.md` → `## [Unreleased]`**, en español,
  bajo `### Agregado`, `### Cambiado`, `### Corregido`, `### Seguridad` o `### Eliminado`.
- **Nunca edites `version` en `package.json` a mano** ni el encabezado de una versión del changelog: lo hace
  `npm run release:*`. `changelog.spec.ts` falla si se desincronizan.
- SemVer: `major` rompe contrato (ruta, campo o rol), `minor` agrega sin romper, `patch` corrige.
- No hagas `git push`, no publiques, no crees tags a mano. Commits solo si el usuario lo pide.

## Pendientes conocidos

- `POST /auth/register` deja elegir el rol (**inseguro**, marcado `TODO(security)`). No lo "arregles" como
  efecto colateral de otra tarea: es una decisión del usuario.
- Imagen Docker sin verificar.
