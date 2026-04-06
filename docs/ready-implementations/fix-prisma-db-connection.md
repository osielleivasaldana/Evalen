# Fix: Conexión Prisma → PostgreSQL en Docker (P1001)

## Fecha
2026-04-05

## Problema
El backend NestJS (`currify-back`) fallaba al iniciar dentro de Docker Compose con el error `PrismaClientInitializationError: Can't reach database server at postgres:5432` (código P1001).

## Causa Raíz
El archivo `currify-back/.env` tenía `DATABASE_URL` apuntando a `localhost:5432` en lugar de `postgres:5432`. Dentro del contenedor Docker, `localhost` se refiere al propio contenedor del backend, no al servicio PostgreSQL. El volumen `./currify-back:/app` montaba este `.env` local, sobrescribiendo la variable correcta definida en `docker-compose.yml`.

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `currify-back/.env` | `localhost` → `postgres` en `DATABASE_URL` |
| `currify-back/Dockerfile` | Agregado `COPY healthcheck.js ./healthcheck.js` |
| `currify-back/src/main.ts` | Eliminado `ValidationPipe` duplicado |
| `currify-back/src/prisma/prisma.service.ts` | Retry mejorado: backoff exponencial con jitter (8 intentos) |

## Detalles Técnicos

### Retry Mechanism Mejorado
- **Antes:** Delay lineal (3s, 6s, 9s, 12s, 15s) — 5 intentos, ~45s máximo
- **Después:** Backoff exponencial con jitter ±25% (2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s) — 8 intentos, ~510s máximo

### Healthcheck
El `healthcheck.js` ahora se copia correctamente en la imagen de producción, permitiendo que el healthcheck del Dockerfile (`nc -z localhost 3001`) y el del docker-compose (`node healthcheck.js`) funcionen como se espera.

## Impacto
- El backend ahora espera correctamente a que PostgreSQL esté listo antes de fallar.
- La conexión se resuelve correctamente en entornos Docker Compose.
- El healthcheck del contenedor backend funciona para orquestación de servicios.
