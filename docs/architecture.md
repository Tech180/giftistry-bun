# Giftistry API Architecture

## Overview

Giftistry-bun follows **Domain-Driven Design (DDD)** with a rich domain model. Each bounded context is organized into four layers with strict dependency rules.

## Layer Structure

```
modules/<context>/
├── domain/           # Entities, value objects, ports, domain services
├── application/      # Use cases (orchestration only)
├── infrastructure/   # Port implementations (Postgres, SMTP, AI, etc.)
└── presentation/     # Thin HTTP routes and middleware
```

### Dependency direction

```
presentation → application → domain ← infrastructure
```

- **Domain** has no outward dependencies (no `sql`, HTTP, Elysia).
- **Application** depends only on domain ports and entities.
- **Infrastructure** implements domain ports.
- **Presentation** delegates to use cases; no business logic.

## Naming conventions

| Pattern | Example | Layer |
|---------|---------|-------|
| `*UseCase` | `AddItemUseCase` | application |
| `*Repository` (interface) | `ItemRepository` | domain/ports |
| `Postgres*Repository` | `PostgresItemRepository` | infrastructure |
| `*.vo.ts` | `Email`, `Money` | domain (value objects) |
| `*.routes.ts` | `item.routes.ts` | presentation |

## Rich domain model

Entities carry behavior; use cases orchestrate:

```typescript
// Use case orchestrates
const user = await userRepo.findByEmail(email);
user.assertCanLogin(sitePolicy);
user.recordFailedLogin();
await userRepo.update(user);
```

Value objects validate at construction:

```typescript
const email = Email.create(rawEmail); // throws DomainError if invalid
```

## Shared kernel

Cross-cutting value objects and ports live in `src/common/domain/`:

- Value objects: `Email`, `Money`, `Username`, `ListRole`, `SitePolicy`
- Ports: `SitePolicyRepository`, `UserPolicyRepository`, `AuditLogRepository`
- Use cases: `GetSitePolicyUseCase`, `WriteAuditLogUseCase`, etc.

## Composition root

All dependency wiring happens in `src/app.container.ts`. Modules do not export concrete repository singletons.

## Rules (enforced by CI)

1. No `sql` imports outside `infrastructure/` directories.
2. No static service classes in `common/services/`.
3. Routes delegate exclusively to use cases.
4. External systems (email, AI, scraping) are accessed through domain ports.
