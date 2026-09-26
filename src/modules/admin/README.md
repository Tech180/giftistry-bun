# `modules/admin`

Admin console: users, site policy, audit log, comment moderation, reports.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Admin user helpers, report ports |
| `slices/` | Vertical behavior use cases |
| `infrastructure/` | `repositories/`, `constants/` (SQL selects), `utils/`, `interfaces/` (row shapes) |
| `presentation/` | `admin.routes.ts` composer; `routes/` per slice; `middlewares/`, `schemas/`, `utils/`, `interfaces/` |
| `index.ts` | Public barrel |

## Slices

| Slice | Owns |
|-------|------|
| `users` | list/get/create/update/delete admin users, reset password, unlock, revoke sessions |
| `moderation` | moderate comments |
| `reports` | create report, handle report |
| `policy` | get/save site policy, update user policy |
| `audit` | admin overview, list audit log |

## Public surface

- **Module:** `createAdminModule`
- **Authz:** `AdminUser.assertAdmin` on routes
- **Reports:** user-facing create may live on authenticated reports routes

## Related

- [↑ modules](../README.md)  
- [auth](../auth/README.md)  
- [system](../system/README.md)
