# `modules/system`

Server setup, settings, status, AI connection probes, metadata packs, ownership transfer.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | `ServerConfig` interfaces/utils/constants, metadata packs, server-config port, prompts |
| `slices/` | Vertical behavior use cases (no flat `application/` folder) |
| `infrastructure/` | Postgres server config repo + SQL row maps |
| `presentation/` | Thin route groups under `/api/system` |
| `interfaces/` | `SystemModuleDeps` |
| `index.ts` | Public barrel |

## Slices

| Slice | Owns |
|-------|------|
| `settings` | setup, get/save settings, status, ntfy test, transfer ownership, delete server, push public config (`utils/` for remote DB/SMTP verify) |
| `ai` | test AI connection, list models (`utils/` for OpenRouter/local fetch + verification) |
| `packs` | get metadata packs catalog (`utils/to-metadata-pack-view`) |

## Presentation

| Routes | Auth |
|--------|------|
| `public` | status (open), setup (optional setup token) |
| `settings` | owner |
| `push-public` | authenticated |
| `ntfy` | owner |
| `ai` | owner |
| `ownership` | authenticated (use cases enforce owner) |

## Public surface

- **Module:** `createSystemModule`
- **Routes:** setup, settings, status, models, metadata packs, push public config
- **Barrel also exports:** `SaveSystemSettingsUseCase`, `TestAiConnectionUseCase`, pack helpers, AI prompt defaults

## Notes

- `ServerConfig` is the domain config surface; persistence mapping stays in the repository.
- Custom AI metadata packs are sanitized in `domain/packs/`.

## Related

- [↑ modules](../README.md)  
- [auth](../auth/README.md)  
- [item](../item/README.md)
