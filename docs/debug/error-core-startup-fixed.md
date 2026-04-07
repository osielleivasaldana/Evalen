# Fix: Backend no puede conectar a PostgreSQL al iniciar

## Causa Raíz Identificada

El error `PrismaClientInitializationError: Can't reach database server at postgres:5432` (P1001) tenía **tres causas combinadas**:

### 1. PrismaService sin mecanismo de reintentos
El archivo `src/prisma/prisma.service.ts` llamaba a `this.$connect()` directamente en `onModuleInit()` sin ningún mecanismo de reintento. En entornos Docker, aunque exista `depends_on: condition: service_healthy`, el contenedor del backend puede iniciar su proceso de aplicación antes de que PostgreSQL esté completamente listo para aceptar conexiones. Un solo fallo resultaba en un crash inmediato del contenedor.

### 2. Healthcheck de Docker apuntando a ruta incorrecta
El archivo `healthcheck.js` apuntaba a `path: '/'`, pero el backend tiene configurado `app.setGlobalPrefix('api')` en `main.ts`, por lo que la ruta correcta es `/api/health`. No existía ningún endpoint de health, lo que hacía que el healthcheck de Docker fallara siempre.

### 3. Ausencia de módulo de Health
No existía un `HealthController` que expusiera un endpoint `/api/health` para que Docker pudiera verificar la salud del servicio, incluyendo el estado de la conexión a la base de datos.

## Cambios Realizados

### 1. `currify-back/src/prisma/prisma.service.ts` — Reintentos con backoff lineal
- Se agregó un método `connectWithRetry()` que intenta conectar hasta **5 veces** con un delay incremental (3s, 6s, 9s, 12s, 15s).
- Se agregó logging con `Logger` de NestJS para cada intento fallido y éxito.
- Si después de todos los reintentos no se logra conectar, se lanza el error original para que el contenedor falle de forma controlada.

### 2. `currify-back/src/health/health.controller.ts` — Nuevo endpoint de salud
- Endpoint `GET /api/health` que verifica la conexión a PostgreSQL ejecutando `SELECT 1`.
- Retorna JSON con `status`, `timestamp`, `database` (connected/disconnected) y `uptime`.

### 3. `currify-back/src/health/health.module.ts` — Módulo de Health
- Módulo que registra el `HealthController` e importa `PrismaModule`.

### 4. `currify-back/src/app.module.ts` — Registro del HealthModule
- Se importó `HealthModule` en el AppModule.
- Se eliminó la importación duplicada de `NotificationsModule`.

### 5. `currify-back/healthcheck.js` — Corrección de ruta
- Se cambió `path: '/'` por `path: '/api/health'` para coincidir con el global prefix del backend.

### 6. `currify-back/jest.config.js` — Configuración de Jest (nuevo)
- Se creó la configuración de Jest para ejecutar pruebas unitarias co-localizadas.

### 7. `currify-back/src/prisma/prisma.service.spec.ts` — Pruebas unitarias (nuevo)
- 7 pruebas que validan: conexión exitosa, reintentos con éxito eventual, fallo tras agotar reintentos, logging correcto, y desconexión.

### 8. `currify-back/src/health/health.controller.spec.ts` — Pruebas unitarias (nuevo)
- 4 pruebas que validan: respuesta ok con DB conectada, respuesta error con DB desconectada, y formato de timestamp.

### 9. `currify-back/package.json` — Dependencias de testing
- Se instalaron: `jest`, `ts-jest`, `@types/jest`, `@nestjs/testing` como devDependencies.

## Cómo Verificar que Funciona

### Ejecutar pruebas unitarias
```bash
cd currify-back
npm test
```

### Levantar con Docker Compose
```bash
docker compose up --build
```

El backend ahora:
1. Esperará a que PostgreSQL esté listo gracias a los reintentos en `PrismaService`.
2. Expondrá `/api/health` para que Docker verifique su estado.
3. El healthcheck de Docker apuntará a la ruta correcta.

### Verificar health endpoint manualmente
```bash
curl http://localhost:3001/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-04-05T...",
  "database": "connected",
  "uptime": 12.345
}
```
