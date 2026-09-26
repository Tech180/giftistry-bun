# `modules/registration-invite`

First-run / gated registration invite tokens (admin-managed).

Compact module — use cases live under `application/` (no behavior slices). Cross-module imports should use the public barrel `@/modules/registration-invite`.

## Layers

| Folder | Role |
|--------|------|
| `index.ts` | Public barrel (ports, types, signup helpers, module factory) |
| `domain/` | Invite interface, list-status type/constants, usability utils, repo port |
| `application/` | Status, regenerate, delete, validate, signup assert helpers |
| `infrastructure/` | Postgres repo, invite select/row mapper |
| `presentation/` | Admin + public route groups, schemas |

## Public surface

- **Barrel:** `@/modules/registration-invite`
- **Module:** `createRegistrationInviteModule`
- **Admin:** `/api/admin/registration-invite`
- **Public:** `/api/auth/registration-invite/:token`

## Related

- [↑ modules](../README.md)  
- [auth](../auth/README.md)  
- [admin](../admin/README.md)
