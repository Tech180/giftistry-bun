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
| `consts/` | `runtime-config.ts` — `getEnv()` / `loadRuntimeConfig()` |
| `database/` | Pool, migrations, schema bootstrap |
| `domain/` | Shared VOs (`Email`, `Money`, `ListRole`, …), ports, events |
| `infrastructure/` | SecretSource, config loader, shared Postgres repos, event bus |
| `middlewares/` | Error handler, rate limit, list-access |
| `types/` | Route middleware types, shared DTOs |
| `utils/` | Tokens, public URL, AI connection helpers, case transforms |

## Hotspots

| Area | Notes |
|------|-------|
| `consts/runtime-config.ts` | Prefer `getEnv()`; `env` Proxy is deprecated |
| `infrastructure/secrets/` | Env / `*_FILE` / credentials-dir providers |
| `middlewares/list-access.middleware.ts` | Derives `checkListAccess` for list-scoped routes |
| `database/connection.ts` | Active SQL pool; only infrastructure should import `sql` |

## Related

- [↑ src](../README.md)  
- [docs/architecture.md](../../docs/architecture.md)  
- [docs/development.md](../../docs/development.md)
