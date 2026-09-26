# `modules/auth`

Authentication, sessions, profile, passkeys, 2FA, OIDC, and theme CSS delivery.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | `User`, passkeys, email / OIDC / user repo ports |
| `slices/` | Vertical behavior use cases |
| `infrastructure/` | Repositories, adapters (SMTP, OpenID), OAuth state store |
| `presentation/` | Thin route composer, slice route plugins, middleware, schemas, mappers |
| `index.ts` | Public barrel |

## Slices

| Slice | Owns |
|-------|------|
| `session` | signup/login, current user, password, verify email, disable/delete account, 2FA login |
| `passkeys` | register/list/delete, passkey login, WebAuthn RP id util |
| `two-factor` | setup / enable / disable TOTP |
| `oidc` | begin login + callback |
| `profile` | update profile, onboarding, tutorial, user preview |
| `themes` | custom themes CRUD + theme CSS |

## Public surface

- **Module:** `createAuthModule` → Elysia plugin + middleware helpers
- **Middleware:** `createAuthMiddleware` → `getAuthUser` / `getOptionalAuthUser`; `createOwnerAuthMiddleware` / `ownerAuthMiddleware` → `getOwnerUser`
- **Routes:** `/api/auth/*`, theme CSS/font endpoints, user preview

## Notes

- Prefer `getEnv()` for JWT/SMTP secrets; production JWT is validated at boot.
- Theme CSS responses are cached (`theme-response.util.ts`).

## Related

- [↑ modules](../README.md)  
- [system](../system/README.md)  
- [registration-invite](../registration-invite/README.md)
