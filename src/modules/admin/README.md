# `modules/admin`

Admin console: users, site policy, audit log, comment moderation, reports.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Admin user helpers, report ports |
| `application/` | User CRUD/policy/reset/unlock, audit, moderation, reports |
| `infrastructure/` | Postgres admin/report adapters (where applicable) |
| `presentation/` | `admin.routes.ts`, `reports.routes.ts` under `/api/admin` |

## Public surface

- **Module:** `createAdminModule`
- **Authz:** `AdminUser.assertAdmin` on routes
- **Reports:** user-facing create report may live on authenticated reports routes

## Related

- [↑ modules](../README.md)  
- [auth](../auth/README.md)  
- [system](../system/README.md)
