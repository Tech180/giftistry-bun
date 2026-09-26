# `src/`

Source map for the Giftistry API. Nested READMEs get more local as you descend.

## Layout

```
src/
├── modules/           # Bounded contexts (see modules/README.md)
├── common/            # Shared kernel, DB, middleware, runtime config
├── boot/              # Adapter + realtime publisher + HTTP/WS wiring
├── app.container.ts   # Composition root — createAppContainer()
├── index.ts           # Thin HTTP entry (api / all roles)
└── worker.ts          # Job worker entry (worker role)
```

| Path | Role |
|------|------|
| [modules/](modules/README.md) | Bounded contexts (DDD / hexagonal modules) |
| [common/](common/README.md) | Shared kernel, DB, middleware, config |
| [boot/](boot/README.md) | `wire-adapters.ts`, `runtime-publishers.ts`, `create-http-app.ts` |
| `app.container.ts` | Wires adapters → modules → event handlers |
| `index.ts` | API process (role guard → container → `createHttpApp` → listen) |
| `worker.ts` | Background job process |

## Start here

1. [docs/architecture.md](../docs/architecture.md) — layers, slices, barrels, errors, events  
2. [docs/development.md](../docs/development.md) — scripts and verify  
3. Pick a module under [modules/](modules/README.md)

## Dependency rule

```
presentation → application|slices → domain ← infrastructure
```

Concrete adapters are created in `boot/wire-adapters.ts` and assembled in `app.container.ts` only. HTTP/WS composition lives in `boot/create-http-app.ts`.

## Related

- [↑ Root README](../README.md)  
- [↑ Contributing](../CONTRIBUTING.md)
