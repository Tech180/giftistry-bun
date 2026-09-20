# `scripts/`

Operator and CI helper scripts (run via `bun run …` from the repo root).

## Scripts

| File | Purpose |
|------|---------|
| `check-sql-imports.ts` | Fail if `sql` is imported outside allowlisted infrastructure paths (`bun run check:sql`) |
| `check-layers.ts` | Fail on application→infra / domain layer leaks (`bun run check:layers`) |
| `ensure-test-database.ts` | Create/prepare isolated test DB (`pretest`) |
| `reset-database.ts` | Destructive schema reset (refuses test DB without force) |
| `giftistry-admin.ts` | Admin CLI utilities |

## Notes

- Prefer `bun run verify` before PRs (runs both checks + tests).
- Do not put secrets in scripts or commit `.env` files.

## Related

- [docs/development.md](../docs/development.md)  
- [Contributing](../CONTRIBUTING.md)
