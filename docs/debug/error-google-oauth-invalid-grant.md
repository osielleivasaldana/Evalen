# Debug: Google OAuth `invalid_grant` — TokenError: Bad Request

## 📋 Resumen del Error

El backend crasheaba con status 500 cuando un usuario intentaba autenticarse con Google OAuth. El error `invalid_grant` es un `TokenError` de passport-google-oauth20 que ocurre durante el intercambio del código de autorización por un access token.

## 🔍 Causas Raíz Identificadas

### 1. 🔴 Variables de Google OAuth FALTANTES en `.env` (Causa Principal)

El archivo `.env` solo contenía `DATABASE_URL`. **No tenía** las siguientes variables:

```
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL=""
```

La estrategia `GoogleStrategy` usaba valores por defecto (`'dummy-client-id'` / `'dummy-client-secret'`), que Google rechaza inmediatamente con `invalid_grant`.

### 2. 🔴 Manejo de Errores Inexistente

- **`google.strategy.ts`**: No capturaba errores del callback de Passport. El `TokenError` se propagaba directamente y crasheaba la app con 500.
- **`auth.controller.ts`**: El endpoint `/google/callback` asumía que `req.user` siempre existía. Si la estrategia fallaba, el código intentaba desestructurar `undefined` y crasheaba.

### 3. 🟡 `.env.example` Incompleto

No documentaba las variables de Google OAuth, por lo que los desarrolladores no sabían que necesitaban configurarlas.

## ✅ Solución Aplicada (Fase 2 — Refactorización a Patrón NestJS)

### Problema de la Fase 1

La solución inicial usaba un enfoque manual anti-patrón con `passport.authenticate()` invocado directamente dentro del controller. Esto causaba el error `passport.authenticate is not a function` porque no es el enfoque recomendado en NestJS con `@nestjs/passport`.

### Solución Final: Guard + ExceptionFilter

Se restauró el patrón nativo de NestJS:

| Archivo | Cambio |
|---------|--------|
| `src/auth/auth.controller.ts` | Restaurado `@UseGuards(AuthGuard('google'))` + `@UseFilters(OAuthExceptionFilter)`. Handler simplificado usando `req.user`. |
| `src/auth/filters/oauth-exception.filter.ts` | **NUEVO** — ExceptionFilter que captura `UnauthorizedException` de OAuth y redirige al frontend con códigos de error amigables. |
| `src/auth/strategies/google.strategy.ts` | Validación de credenciales en constructor, null-safety en profile, try/catch en validate (sin cambios). |

### Arquitectura del Flujo OAuth

```
GET /api/auth/google
  → AuthGuard('google') → Redirige a Google

GET /api/auth/google/callback
  → AuthGuard('google')
    ├── ✅ Success → req.user populated → Controller → redirect ?token=...&new=...
    └── ❌ Error → UnauthorizedException → OAuthExceptionFilter → redirect ?error=...&message=...
```

### Tabla de Mapeo de Errores (OAuthExceptionFilter)

| Trigger | Error Code | Mensaje al Usuario |
|---------|-----------|-------------------|
| `invalid_grant` o "authorization code" | `invalid_grant` | "Google authentication failed. The authorization code expired or was invalid. Please try signing in again." |
| `client_id` o `client_secret` | `misconfigured` | "Authentication service is misconfigured. Please contact support." |
| "email" en el mensaje | `no_email` | "Your Google account does not have a verified email address. Please use a different account." |
| "unauthorized" o "denied" | `unauthorized` | "Google authentication was denied. Please check your Google account settings and try again." |
| Cualquier otro error | `oauth_error` | "Authentication failed. Please try again." |

## 🔧 Configuración Externa Requerida (Google Cloud Console)

El usuario **DEBE** completar estos pasos para que Google OAuth funcione:

1. Ir a [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Crear un proyecto o seleccionar uno existente
3. Habilitar la **Google+ API** (o la API de People)
4. Crear credenciales **OAuth 2.0 Client ID** (tipo: Web application)
5. Configurar los **Authorized redirect URIs**:
   - Desarrollo: `http://localhost:3001/api/auth/google/callback`
   - Producción: `https://tu-dominio.com/api/auth/google/callback`
6. Copiar el **Client ID** y **Client Secret** al archivo `.env`:

```env
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
```

## 🧪 Verificación

```bash
cd currify-back
npx jest --testPathPatterns="auth" --verbose
# Expected: 48 tests passing
```

## 📝 Notas Adicionales

- El error `invalid_grant` también puede ocurrir si el código de autorización de Google expira (~10 min) o se reutiliza. Esto es normal y el nuevo manejo de errores redirige al frontend con un mensaje claro.
- El callback URL en Google Cloud Console debe coincidir **exactamente** con el valor de `GOOGLE_CALLBACK_URL` en el `.env`.
- El `OAuthExceptionFilter` solo captura `UnauthorizedException`, que es el tipo de excepción que `AuthGuard('google')` lanza cuando la estrategia falla.
