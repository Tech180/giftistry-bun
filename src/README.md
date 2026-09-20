# `src/`

Source map for the Giftistry API. Nested READMEs get more local as you descend.

## Layout

| Path | Role |
|------|------|
| [modules/](modules/README.md) | Bounded contexts (DDD modules) |
| [common/](common/README.md) | Shared kernel, DB, middleware, runtime config |
| [boot/](boot/README.md) | Process boot helpers (realtime publisher wiring) |
| `app.container.ts` | Composition root — wires modules + deps |
| `index.ts` | HTTP/WS entry (`api` / `all` roles) |
| `worker.ts` | Job worker entry (`worker` role) |

## Start here

1. [docs/architecture.md](../docs/architecture.md) — layers + ports  
2. [docs/development.md](../docs/development.md) — scripts and verify  
3. Pick a module under [modules/](modules/README.md)

## Dependency rule

```
presentation → application → domain ← infrastructure
```

Composition root (`app.container.ts`) is the only place that should assemble concrete adapters into modules.

## Related

- [↑ Root README](../README.md)  
- [↑ Contributing](../CONTRIBUTING.md)
