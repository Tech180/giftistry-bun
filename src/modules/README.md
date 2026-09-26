# `modules/`

Bounded contexts. Each folder is a hexagonal module with a public `index.ts` barrel and a `createXModule` factory.

## Allowed / forbidden

- **May import:** `common/`, other modules via **`@/modules/<context>`** barrels, same-module layers per the rule below
- **Must not:** import `sql` / `common/database` outside `infrastructure/`
- **Must not:** import `*/infrastructure/*` from `application/`, `slices/`, or `domain/`
- Wire adapters only through `app.container.ts` + `boot/wire-adapters.ts`

## Layers

```
modules/<context>/
  index.ts             # Public barrel
  domain/              # entities, VOs, ports, events
  slices/<behavior>/   # use cases (large modules)
  application/         # use cases (compact) and/or published ports
  infrastructure/      # Postgres*, SMTP, AI, WS, scrapers
  presentation/        # *.routes.ts — thin
```

`presentation → application|slices → domain ← infrastructure`

## Modules

| Module | Use-case home | Notes |
|--------|---------------|-------|
| [admin](admin/README.md) | **slices:** users, moderation, reports, policy, audit | Admin console |
| [auth](auth/README.md) | **slices:** session, passkeys, two-factor, oidc, profile, themes | Auth + themes |
| [comment](comment/README.md) | **application/** | Comments + reactions |
| [friends](friends/README.md) | **application/** | Friends + search |
| [invites](invites/README.md) | **application/** | List link/email invites |
| [item](item/README.md) | **slices:** catalog, claims, substitutions, links, metadata, import, funding; **application/ports** | Items, scrape, AI |
| [jobs](jobs/README.md) | **slices:** import, enrich, summarize; **application/** runner | Background jobs |
| [notifications](notifications/README.md) | **application/** | In-app + push |
| [registration-invite](registration-invite/README.md) | **application/** | Install/signup invites |
| [system](system/README.md) | **slices:** settings, ai, packs | Setup + settings |
| [wishlist](wishlist/README.md) | **slices:** lists, shares, priorities, export, rollover, access; **application/ports** | Lists + PDF |

## Related

- [↑ src](../README.md)  
- [docs/architecture.md](../../docs/architecture.md)
