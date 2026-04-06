# Fix: Backend PostgreSQL Connection Failure on Startup

## Fecha
2026-04-05

## Tipo
🐛 Bug Fix — Crítico (impedía el arranque del sistema)

## Resumen
El servicio `currify-back` (NestJS) fallaba al iniciar con `PrismaClientInitializationError: Can't reach database server at postgres:5432` (P1001).

## Causa Raíz
Tres problemas combinados:
1. **Sin reintentos en PrismaService** — Un fallo de conexión crasheaba el contenedor inmediatamente
2. **Healthcheck con ruta incorrecta** — `healthcheck.js` apuntaba a `/` en vez de `/api/health`
3. **Sin HealthController** — No existía endpoint de health para Docker

## Solución Aplicada
- **Reintentos con backoff lineal** en `PrismaService.onModuleInit()` (5 intentos, 3s-15s)
- **Nuevo HealthController** en `/api/health` con verificación de DB (`SELECT 1`)
- **Corrección de healthcheck.js** para apuntar a `/api/health`
- **Eliminación de import duplicado** de `NotificationsModule` en `AppModule`
- **11 pruebas unitarias** pasando (7 PrismaService + 4 HealthController)

## Archivos Modificados
- `currify-back/src/prisma/prisma.service.ts`
- `currify-back/src/app.module.ts`
- `currify-back/healthcheck.js`
- `currify-back/package.json`

## Archivos Nuevos
- `currify-back/src/health/health.controller.ts`
- `currify-back/src/health/health.module.ts`
- `currify-back/src/prisma/prisma.service.spec.ts`
- `currify-back/src/health/health.controller.spec.ts`
- `currify-back/jest.config.js`

## Delegado a
`@backend-expert`

## Estado
✅ **Completado y documentado**

## Referencia
- Log original: `docs/debug/error-core-startup.md`
- Fix detallado: `docs/debug/error-core-startup-fixed.md`
