# `modules/registration-invite`

First-run / gated registration invite tokens (admin-managed).

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Registration invite entity + repo port |
| `application/` | Status, regenerate, delete, validate |
| `infrastructure/` | Postgres registration-invite repo |
| `presentation/` | Admin + public validate routes |

## Public surface

- **Module:** `createRegistrationInviteModule`
- **Admin:** `/api/admin/registration-invite`
- **Public:** `/api/auth/registration-invite/:token`

## Related

- [↑ modules](../README.md)  
- [auth](../auth/README.md)  
- [admin](../admin/README.md)
