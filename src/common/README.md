# `common/`

Shared kernel and cross-cutting infrastructure used by every module.

## Allowed / forbidden

- **May import:** packages; other `common/` paths
- **Must not:** grow unbounded business SQL here — prefer module infrastructure
- **Must not:** add static “service classes” under `services/` (prefer ports + adapters)
- Domain VOs/ports here are the **shared kernel**

## Children

| Path | Role |
|------|------|
| `application/` | Cross-module use cases (site policy, audit log, user policy helpers) |
| `config/` | `loadRuntimeConfig()` + `utils/get-env.util.ts` (`getEnv()`) |
| `database/` | Pool, migrations, schema bootstrap |
| `domain/` | Shared VOs, ports, events; policy interfaces/constants/utils |
| `infrastructure/` | Shared Postgres repos, secrets providers/sources, event bus |
| `middlewares/` | Error handler, rate limit, list-access |
| `utils/` | Cross-cutting helpers; `constants/`, `interfaces/`, `types/` for shared shapes |

## Hotspots

| Area | Notes |
|------|-------|
| `config/utils/get-env.util.ts` | Use `getEnv()` for typed runtime config |
| `infrastructure/secrets/` | `providers/`, `sources/`, JWT ensure helpers |
| `middlewares/list-access.middleware.ts` | Derives `checkListAccess` for list-scoped routes |
| `database/` | Pool, migrations, schema bootstrap (`@/common/database`) |

## Related

- [↑ src](../README.md)  
- [docs/architecture.md](../../docs/architecture.md)  
- [docs/development.md](../../docs/development.md)
