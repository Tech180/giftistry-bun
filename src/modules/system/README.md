# `modules/system`

Server setup, settings, status, AI connection probes, metadata packs, ownership transfer.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | `ServerConfig`, metadata pack catalog/utils, server-config port |
| `application/` | Status, setup, get/save settings, AI test/list models, packs, ntfy test, transfer/delete |
| `infrastructure/` | Postgres (or file-backed) server config repository |
| `presentation/` | `system.routes.ts` under `/api/system` |

## Public surface

- **Module:** `createSystemModule`
- **Routes:** setup, settings, status, models, metadata packs, push public config

## Notes

- `ServerConfig` is the domain config surface; persistence mapping stays in the repository.
- Custom AI metadata packs are sanitized in `domain/packs/`.

## Related

- [↑ modules](../README.md)  
- [auth](../auth/README.md) (owner onboarding)  
- [item](../item/README.md) (packs drive populate/scrape fields)
