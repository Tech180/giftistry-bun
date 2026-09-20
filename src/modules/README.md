# `modules/`

Bounded contexts. Each folder is a DDD module with a public `*.module.ts` factory.

## Allowed / forbidden

- **May import:** `common/`, other modules' **domain ports/entities** (sparingly), same-module layers per the rule below
- **Must not:** import `sql` / postgres client outside `infrastructure/`
- **Must not:** call infrastructure adapters from `application/` or `domain/` — use ports
- Prefer wiring through `createXModule` + `app.container.ts`

## Layers (every module)

```
modules/<context>/
  domain/            # entities, VOs, ports
  application/       # *UseCase
  infrastructure/    # Postgres*, SMTP, AI, WS, scrapers
  presentation/      # *.routes.ts — thin
```

`presentation → application → domain ← infrastructure`

## Domains

| Domain | README |
|--------|--------|
| [admin](admin/README.md) | Users, moderation, audit, site policy, reports |
| [auth](auth/README.md) | Signup/login, sessions, passkeys, 2FA, OIDC, themes |
| [comment](comment/README.md) | Wishlist comments + reactions + realtime |
| [friends](friends/README.md) | Friends, requests, user search |
| [invites](invites/README.md) | Link/email list invites + accept routes |
| [item](item/README.md) | Items, claims, substitutions, scrape, AI |
| [jobs](jobs/README.md) | Background jobs + progress fanout |
| [notifications](notifications/README.md) | In-app notifications + push |
| [registration-invite](registration-invite/README.md) | Install/registration invite tokens |
| [system](system/README.md) | Setup, settings, AI probes, metadata packs |
| [wishlist](wishlist/README.md) | Lists, shares, export/PDF, presence |

## Related

- [↑ src](../README.md)  
- [docs/architecture.md](../../docs/architecture.md)
