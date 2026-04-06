# Fix: Google OAuth Error Handling

## 📋 Resumen

Se implementó manejo robusto de errores para el flujo de Google OAuth en el backend de Currify. Antes, cualquier error de OAuth (como `invalid_grant`) crasheaba la aplicación con un 500 genérico. Ahora, los errores se capturan, se registran y se redirigen al frontend con mensajes descriptivos.

## 🏗️ Cambios Realizados

### 1. `src/auth/strategies/google.strategy.ts`

**Antes:**
- Sin validación de credenciales en el constructor
- Sin null-safety al acceder a propiedades del profile
- Sin manejo de errores en el método `validate`

**Después:**
- Validación de `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el constructor con `Logger.warn` si faltan
- Null-safety con optional chaining (`emails?.[0]?.value`, `name?.givenName`, etc.)
- Validación de email obligatorio — retorna `UnauthorizedException` si el profile no tiene email
- Try/catch alrededor de toda la lógica de `validate` — errores se pasan a `done(error, false)`

### 2. `src/auth/auth.controller.ts` (Fase 2 — Refactorización)

**Antes (Fase 1 — Anti-patrón):**
- Usaba `passport.authenticate('google', { session: false }, callback)` manualmente
- Causaba `passport.authenticate is not a function` con Passport 0.7.0 en NestJS

**Después (Fase 2 — Patrón NestJS):**
- Restaurado `@UseGuards(AuthGuard('google'))` — patrón nativo de NestJS
- Agregado `@UseFilters(OAuthExceptionFilter)` — captura errores y redirige al frontend
- Handler simplificado: usa `req.user` (poblado por AuthGuard en caso de éxito)
- Sin invocación manual de passport — todo manejado por el framework

### 3. `src/auth/filters/oauth-exception.filter.ts` (NUEVO)

**ExceptionFilter que captura `UnauthorizedException` de OAuth:**
- Mapea errores comunes a códigos y mensajes amigables:
  - `invalid_grant` → "The authorization code expired or was invalid"
  - `client_id/client_secret` → "Service is misconfigured"
  - "email" → "No verified email address"
  - "unauthorized/denied" → "Authentication was denied"
  - Fallback → "Authentication failed"
- Redirige al frontend con parámetros `?error=` y `?message=`
- Respeta `FRONTEND_URL` del environment

### 4. `.env.example`

**Antes:**
- No incluía variables de Google OAuth

**Después:**
- Agregadas `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- Documentación con enlace a Google Cloud Console
- Ejemplo de Authorized redirect URI

## 🧪 Tests Creados (Co-localizados)

### `src/auth/auth.service.spec.ts` — 18 tests
- `checkEmail`: 3 tests (no existe, local provider, google provider)
- `register`: 2 tests (éxito, email duplicado)
- `login`: 4 tests (éxito, no encontrado, sin password, password inválido)
- `validateOAuthLogin`: 3 tests (crear nuevo, existente, actualizar socialId)
- `activateAccount`: 4 tests (éxito, token inválido, token expirado, ya activo)
- `findUserById`: 2 tests (con campañas, no encontrado)

### `src/auth/auth.controller.spec.ts` — 11 tests
- `checkEmail`, `register`, `login`, `getProfile`, `activate`: 5 tests
- `googleAuth`: 1 test (definido)
- `googleAuthRedirect`: 5 tests (éxito, nuevo usuario, state param, sin user, custom URL)

### `src/auth/strategies/google.strategy.spec.ts` — 7 tests
- Constructor: 3 tests (definido, credenciales faltantes, callback por defecto)
- Validate: 4 tests (éxito, sin email, error de servicio, error de BD)

### `src/auth/filters/oauth-exception.filter.spec.ts` — 12 tests (NUEVO)
- `invalid_grant`: 2 tests (mensaje directo, authorization code expired)
- `client_id/client_secret`: 2 tests (cada uno)
- `unauthorized`: 2 tests (Access denied, Unauthorized access)
- `no_email`: 1 test
- `oauth_error` (fallback): 1 test
- `FRONTEND_URL`: 2 tests (custom, default)
- Response formats: 2 tests (string, object)

**Total: 48 tests passing** ✅

## 📊 Resultado

El manejo de errores es ahora **robusto** y sigue los **patrones nativos de NestJS**:
- ✅ No crashea la aplicación con 500 genéricos
- ✅ Registra errores con contexto (Logger)
- ✅ Redirige al frontend con mensajes descriptivos
- ✅ Valida credenciales al inicio (fail-fast con warning)
- ✅ Protege contra null/undefined en datos del profile
- ✅ Usa `@UseGuards(AuthGuard)` + `@UseFilters(ExceptionFilter)` — patrón NestJS correcto
- ✅ Tests unitarios co-localizados cubriendo casos de éxito y fallo
