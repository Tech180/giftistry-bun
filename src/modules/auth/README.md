# `modules/auth`

Authentication, sessions, profile, passkeys, 2FA, OIDC, and theme CSS delivery.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | `User`, passkeys, email sender / OIDC / user repo ports |
| `application/` | Signup, login, profile, 2FA, passkeys, OIDC, themes, onboarding |
| `infrastructure/` | Postgres user repo, SMTP adapter, OpenID client |
| `presentation/` | `auth.routes.ts`, `theme.routes.ts`, auth middleware factory |

## Public surface

- **Module:** `createAuthModule` → Elysia plugin + exports middleware helpers
- **Middleware:** `createAuthMiddleware` → derives `getAuthUser` / `getOptionalAuthUser`
- **Routes:** `/api/auth/*`, theme CSS/font endpoints, user preview

## Notes

- Prefer `getEnv()` for JWT/SMTP secrets; production JWT is validated at boot.
- Theme CSS is cached responses (`theme-response.util.ts`).

## Related

- [↑ modules](../README.md)  
- [system](../system/README.md) (owner onboarding / setup)  
- [registration-invite](../registration-invite/README.md)
