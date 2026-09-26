# Development

How to run, test, and verify the Giftistry API locally.

## Prerequisites

- **Bun** 1.x
- **PostgreSQL** 16+ (or via Nix)
- Optional: Chromium for Playwright scraping (required on NixOS — see [architecture.md](architecture.md))
- Sibling **`theming-engine`** checkout for theme CSS builds (`predev` / `prestart`)

## Install

```bash
bun install
cp .env.example .env   # if present; otherwise set PG* / JWT_SECRET in the environment
bun run scripts/ensure-test-database.ts   # optional
```

## Scripts

| Command | Purpose |
| ------- | ------- |
| `bun run dev` | Hot-reload API (`GIFTISTRY_PROCESS_ROLE=all` by default) |
| `bun run start` | Production-style API process |
| `bun run worker` / `bun run dev:worker` | Job worker only |
| `bun test` | Test suite (isolated test DB; `pretest` ensures DB) |
| `bun run verify` | `check:sql` + `check:layers` + tests — run before a PR |
| `bun run check:sql` | Forbid `sql` imports outside infrastructure allowlist |
| `bun run check:layers` | Forbid application→infra / domain leaks |
| `bun run collections:generate` | Regenerate HTTPie collection from OpenAPI |
| `bun run reset-database` | Destructive DB reset (guarded against test DB) |
| `bun run giftistry-admin` | Admin CLI helpers |

## Typical loop

```bash
bun run dev
# another terminal:
bun test path/to/file.test.ts
bun run verify
```

OpenAPI UI: `http://localhost:3001/docs` · JSON: `/docs/json`.

## Split API + worker

Default `bun dev` uses `GIFTISTRY_PROCESS_ROLE=all` (HTTP and jobs in one process).

To mirror production:

```bash
# terminal A — API only
GIFTISTRY_PROCESS_ROLE=api bun src/index.ts

# terminal B — jobs
GIFTISTRY_PROCESS_ROLE=worker bun src/worker.ts
```

Realtime fanout between processes uses Postgres LISTEN/NOTIFY. See `src/boot/` and `src/worker.ts`.

## HTTPie collection

Generated under `collections/` from live OpenAPI plus a curated overlay:

```bash
bun run collections:generate
```

Import `httpie-collection-giftistry.json` and `httpie-environment-local.json`. Set `{{token}}` after login.

## Environment variables

| Variable | Secret? | Description |
|----------|---------|-------------|
| `NODE_ENV` | no | `development` or `production` |
| `PORT` | no | HTTP port (default `3001`) |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` | no | PostgreSQL connection |
| `PGPASSWORD` | **yes** | Database password |
| `JWT_SECRET` | **yes** | Session signing key; required in production (≥32 chars) |
| `GIFTISTRY_PUBLIC_APP_URL` | no | Bootstrap public browser URL (emails, CORS, WebAuthn) when `config.json` → `PublicAppUrl` is unset. Saved admin `PublicAppUrl` wins once set. |
| `GIFTISTRY_ALLOW_SETUP` | no | When `false`, blocks first-run setup even if no users exist (default `true`) |
| `GIFTISTRY_SETUP_TOKEN` | **yes** | When set, setup requires matching header/body token |
| `GIFTISTRY_CONFIG_PATH` | no | Override path to `config.json` |
| `GIFTISTRY_PROCESS_ROLE` | no | `all` (default), `api`, or `worker` |
| `SMTP_*` / `SMTP_PASS` | mixed | Default/local SMTP |
| `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OAUTH_CLIENT_SECRET` | **yes** | AI / OAuth fallbacks |
| `CREDENTIALS_DIRECTORY` / `GIFTISTRY_CREDENTIALS_DIRECTORY` | — | Directory of files named after secret keys |
| `SCRAPE_*` | no | Playwright/fetch scrape timeouts and concurrency — see [architecture.md](architecture.md) |

Use `getEnv()` from `src/common/config/utils/get-env.util.ts` for typed runtime config.

## Production hardening (quick)

- CORS limited to public app URL hostname in production
- Boot fails without public URL / strong `JWT_SECRET`
- Optional setup token for first-run wizard
- Password policy: min 8 chars, letter + number

Server settings (remote SMTP, AI, OAuth, `PublicAppUrl`) live in `config.json` via `/api/system/settings`.

## Related

- [Architecture](architecture.md)
- [Install](INSTALL.md)
- [Source map](../src/README.md)
- [Contributing](../CONTRIBUTING.md)
