# Contributing

Thanks for helping with Giftistry. This guide is for **people changing code** — the root [README](README.md) stays short; this one is the contract for PRs.

## Before you start

1. Read [docs/architecture.md](docs/architecture.md) (DDD layers + ports).
2. Skim [docs/development.md](docs/development.md) (scripts + verify).
3. Skim [src/README.md](src/README.md) so you land in the right folder.
4. Prefer a focused PR over a kitchen-sink refactor.

## What we look for

### Structure

- New work lives in a **module** under `src/modules/<context>/` with the four layers:
  - `domain/` — entities, VOs, ports (no SQL, no Elysia)
  - `application/` — `*UseCase` orchestration only
  - `infrastructure/` — Postgres, SMTP, AI, scrapers, WS adapters
  - `presentation/` — thin routes
- Wire adapters in `src/app.container.ts` / `*.module.ts`, not inside use cases.
- Cross-cutting VOs/ports belong in `src/common/domain/`.

### Code style

- TypeScript strict (`noUncheckedIndexedAccess`); prefer clear, compact expressions.
- Prefer declarative/immutable approaches where they fit.
- Use `getEnv()` for runtime config.
- Never invent or commit secrets.

### Layers (enforced)

```bash
bun run check:sql      # no sql outside infrastructure allowlist
bun run check:layers   # no application→infra / domain leaks
```

### Tests

- Prefer in-process `app.handle(Request)` over binding ports.
- Isolated test DB (`bun test` / `ensure-test-database`).
- Update mocks when constructor deps or ports change.

## PR checklist

- [ ] Right layer (`domain` / `application` / `infrastructure` / `presentation`)
- [ ] Ports for new external I/O; no SQL in application/domain/presentation
- [ ] `bun run verify` green (`check:sql` + `check:layers` + tests)
- [ ] OpenAPI-facing routes: regenerate HTTPie collection if needed (`collections:generate`)
- [ ] Nested README updated if you add a module or change a public surface

## Source map

Nested folder READMEs under `src/` mirror the React client's map:

- [src/README.md](src/README.md)
- [src/modules/README.md](src/modules/README.md)
- [src/common/README.md](src/common/README.md)

## Related

- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Install](docs/INSTALL.md)
