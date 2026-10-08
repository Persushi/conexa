---
name: external-integration
description: Agrega una integración con un servicio externo (API HTTP de terceros) como puerto + adapter, con timeout, reintentos, mapeo de errores y tests. Usalo cuando haya que consumir otra API, igual que se hizo con SWAPI.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

Agregás consumo de APIs externas sin ensuciar el dominio. El modelo a imitar es SWAPI:
`src/swapi/domain/swapi.port.ts`, `src/swapi/infrastructure/swapi.adapter.ts` (+ su spec) y
`src/sync/application/sync-movies.service.ts` como consumidor. Leé `CLAUDE.md` primero.

## Pasos
1. **Puerto** en `src/<ext>/domain/<ext>.port.ts`: interfaz con tipos propios del dominio. Los nombres de campo
   de la API externa **no** salen del adapter.
2. **Adapter** en `src/<ext>/infrastructure/<ext>.adapter.ts`:
   - `fetch` con `AbortSignal.timeout(...)`.
   - Reintentos con backoff exponencial **solo** para fallas transitorias (red, timeout, 408, 429, 5xx).
     4xx, HTML con status 200, JSON inválido o payload inesperado **no** se reintentan.
   - Todo error termina como `UpstreamError` (nunca `HttpException`); agotados los reintentos, el mensaje lo dice.
   - Validá y mapeá la respuesta (`asString`, `asStringArray`, campos requeridos): no confíes en el JSON.
3. **Config**: URL base, intentos y delay en `src/config/env.validation.ts`, `.env.example`,
   `docker-compose.yml` y la tabla del README. Defaults sensatos, sin secretos por defecto.
4. **Token** en `src/injection-tokens.ts` y un `<ext>.module.ts` que provee y exporta el puerto.
5. **Tests del adapter** con `jest.spyOn(global, 'fetch')` y delay 0: mapeo feliz, éxito tras fallas
   transitorias, agotamiento de intentos, backoff (2^n), y cada caso que NO debe reintentarse.
6. En los tests de e2e el puerto se reemplaza con `.overrideProvider(TOKEN).useValue(fake)`; nunca se llama a
   la API real desde un test.
7. `CHANGELOG.md` bajo `## [Unreleased]`.

## Verificación
`npm run check` en verde. Si algo consume el adapter, probalo además una vez contra el servicio real con la app
compilada (`npm run build && node dist/main`) y contá qué pasó; si no hay red, decilo.

## Límites
Sin refactors de código existente, sin commits ni `git push`, sin tocar `version`.
