# Backend Contract: Auth Module — Google OAuth Error Handling

## 📋 Overview

This document specifies the Google OAuth error handling contract for the `currify-back` auth module. It defines how OAuth errors are captured, processed, and communicated to the frontend.

## 🔗 API Endpoints

### `GET /api/auth/google`
- **Purpose:** Initiates Google OAuth flow
- **Guard:** `AuthGuard('google')`
- **Behavior:** Redirects user to Google consent screen
- **No changes** to this endpoint

### `GET /api/auth/google/callback`
- **Purpose:** Handles Google OAuth callback
- **Guard:** `AuthGuard('google')` — NestJS Passport handles the OAuth handshake
- **Filter:** `OAuthExceptionFilter` — Catches `UnauthorizedException` and redirects to frontend with error params
- **Success Response:** Redirects to `${FRONTEND_URL}/auth/callback?token=<jwt>&new=<boolean>[&state=<state>]`
- **Error Response:** Redirects to `${FRONTEND_URL}/auth/callback?error=<error_code>&message=<user_friendly_message>`

## 🛡️ Architecture: Guard + Filter Pattern

```
Request → AuthGuard('google')
  ├── Success → req.user populated → Controller handler → redirect with token
  └── Error → throws UnauthorizedException → OAuthExceptionFilter → redirect with error
```

### `OAuthExceptionFilter` (`src/auth/filters/oauth-exception.filter.ts`)

Catches `UnauthorizedException` thrown by `AuthGuard('google')` and maps them to user-friendly redirect URLs.

#### Error Mapping Table

| Trigger | Error Code | User Message |
|---------|-----------|--------------|
| `invalid_grant` or "authorization code" in message | `invalid_grant` | "Google authentication failed. The authorization code expired or was invalid. Please try signing in again." |
| `client_id` or `client_secret` in message | `misconfigured` | "Authentication service is misconfigured. Please contact support." |
| "email" in message | `no_email` | "Your Google account does not have a verified email address. Please use a different account." |
| "unauthorized" or "denied" in message | `unauthorized` | "Google authentication was denied. Please check your Google account settings and try again." |
| Any other error | `oauth_error` | "Authentication failed. Please try again." |

## 📤 Frontend Contract (Callback Parameters)

### Success
| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | JWT access token |
| `new` | boolean | Whether this is a new user (needs onboarding) |
| `state` | string? | Optional passthrough from initial request |

### Error
| Parameter | Type | Description |
|-----------|------|-------------|
| `error` | string | Error code (see table above) |
| `message` | string | User-friendly error message |

## 🔧 Environment Variables Required

```env
GOOGLE_CLIENT_ID="<from-google-cloud-console>"
GOOGLE_CLIENT_SECRET="<from-google-cloud-console>"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
FRONTEND_URL="http://localhost:3000"
```

## 📁 Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `src/auth/auth.controller.ts` | Modified | Restored `@UseGuards(AuthGuard('google'))` + `@UseFilters(OAuthExceptionFilter)`. Simplified handler to use `req.user`. |
| `src/auth/filters/oauth-exception.filter.ts` | **NEW** | ExceptionFilter that catches OAuth errors and redirects to frontend with user-friendly messages. |
| `src/auth/filters/oauth-exception.filter.spec.ts` | **NEW** | 12 unit tests covering all error mapping scenarios. |
| `src/auth/auth.controller.spec.ts` | Modified | Updated to remove manual `passport.authenticate` mock. Tests now focus on controller logic. |
| `src/auth/strategies/google.strategy.ts` | Unchanged | Credential validation and OAuth login flow (already correct). |
| `src/auth/auth.module.ts` | Unchanged | Module registration (filter applied via `@UseFilters` decorator). |

## 🧪 Tests

| File | Count | Coverage |
|------|-------|----------|
| `src/auth/auth.service.spec.ts` | 18 | Service layer (login, register, OAuth, activate) |
| `src/auth/auth.controller.spec.ts` | 11 | Controller layer (endpoints, OAuth callback) |
| `src/auth/strategies/google.strategy.spec.ts` | 7 | Strategy layer (constructor, validate, errors) |
| `src/auth/filters/oauth-exception.filter.spec.ts` | 12 | Filter layer (error mapping, redirect URLs) |

**Total: 48 tests** — All passing ✅

## 📝 Migration Notes

### Before (Anti-pattern)
```typescript
@Get('google/callback')
async googleAuthRedirect(@Request() req, @Res() res) {
  passport.authenticate('google', { session: false }, (err, user) => { ... })(req, res);
}
```

### After (NestJS Pattern)
```typescript
@Get('google/callback')
@UseGuards(AuthGuard('google'))
@UseFilters(OAuthExceptionFilter)
async googleAuthRedirect(@Request() req, @Res() res) {
  const user = req.user; // Populated by AuthGuard on success
  // ... redirect with token
}
```

The filter handles all error cases, keeping the controller clean and focused on the success path.
