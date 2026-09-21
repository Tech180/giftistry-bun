# Installing Giftistry

Application source lives in sibling repos; **production packaging** (Docker Compose + NixOS) lives in the **giftistry** meta repo.

| Component | Repository | Role |
|-----------|------------|------|
| Packaging | [`giftistry`](../../giftistry) | Compose, NixOS module, operator docs |
| API | `giftistry-bun` | Bun/Elysia backend, PostgreSQL, background jobs |
| Web | `giftistry-react` | React SPA |
| Themes | `theming-engine` | Theme CSS build (API sibling) |

```text
projects/
  giftistry/          # packaging / self-host entry point
  giftistry-bun/
  giftistry-react/
  theming-engine/
```

---

## Option A — Docker or NixOS (self-host)

Use the meta repo:

- [Docker Compose](../../giftistry/docs/install/docker.md) — pull GHCR images (`docker compose up -d`, no sibling clones)
- [NixOS `services.giftistry`](../../giftistry/docs/install/nixos.md)

```bash
cd ../giftistry/docker
cp .env.example .env
cp config/config.example.json config/config.json
# set PGPASSWORD (JWT_SECRET optional — auto-persisted on first boot)
docker compose up -d
```

Do **not** look for `/etc/nixos/flakes/giftistry` — that path was never shipped. The NixOS module is `giftistry/nix` (`nixosModules.giftistry`).

---

## Option B — Local Bun + PostgreSQL

For day-to-day API development. Prefer `nix develop` from the packaging flake (or host `.#giftistry`) so local Postgres matches the sandbox — see [giftistry/docs/development.md](../../giftistry/docs/development.md).

### Prerequisites

- Bun 1.x
- PostgreSQL 16+ (or the packaging nix develop shell)
- Sibling `theming-engine` checkout (for `predev` / `prestart`)

### API

```bash
cd giftistry-bun
bun install
cp .env.example .env
# Edit PG*, JWT_SECRET, GIFTISTRY_PUBLIC_APP_URL
cp config/config.example.json config.json   # or set GIFTISTRY_CONFIG_PATH
bun run scripts/ensure-test-database.ts     # optional
bun run dev                                 # hot reload on :3001
```

### Web

```bash
cd giftistry-react
bun install
bun run dev          # Vite on :3000, API default http://localhost:3001
```

### Both

```bash
cd giftistry-bun && bun run dev:all
```

### Configuration & secrets

**Runtime config** defaults to `./config.json` (override with `GIFTISTRY_CONFIG_PATH`). Start from `config/config.example.json`.

**JWT secret** (production). Provide **one** of, or omit and let the API auto-persist:

| Method | Example |
|--------|---------|
| Auto-persist (default) | No env set → writes `${GIFTISTRY_STATE_DIR:-/var/lib/giftistry}/jwt_secret` on first production boot |
| Environment | `JWT_SECRET=…` in `.env` (≥ 32 chars) |
| File | `JWT_SECRET_FILE=/path/to/jwt_secret` |
| Credentials directory | `CREDENTIALS_DIRECTORY=/run/credentials/…` with file `JWT_SECRET` |

Set `GIFTISTRY_AUTO_JWT_SECRET=false` to forbid auto-generation (boot fails if no explicit secret).

`CREDENTIALS_DIRECTORY` / `GIFTISTRY_CREDENTIALS_DIRECTORY` also supports `SMTP_PASS`, `PGPASSWORD`, `GIFTISTRY_SETUP_TOKEN`, and other named secrets.

**Other useful env vars** (see `.env.example` and [development.md](development.md)):

- `GIFTISTRY_PUBLIC_APP_URL` — public SPA URL (emails, WebAuthn, OAuth, CORS)
- `GIFTISTRY_ALLOW_SETUP` — allow first-run setup when no users exist
- `GIFTISTRY_SETUP_TOKEN` — optional token required for `POST /setup`
- `GIFTISTRY_PROCESS_ROLE` — `all` (default), `api`, or `worker`

### Admin CLI

```bash
cd giftistry-bun
export PGHOST=127.0.0.1 PGUSER=postgres PGPASSWORD=… PGDATABASE=giftistry

bun run giftistry-admin -- list-users
bun run giftistry-admin -- reset-admin-password --username admin
bun run giftistry-admin -- disable-password-login --confirm
bun run giftistry-admin -- set-allow-setup false
```

The CLI refuses `PGDATABASE=giftistry_test` unless `--force` is passed.

---

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | API liveness |
| `GET /docs` | OpenAPI / Swagger UI |

---

## HTTPie collection

API request samples for HTTPie Desktop live in `collections/` and are **derived from OpenAPI** (`GET /docs/json`).

```bash
cd giftistry-bun
bun run collections:generate
```

Import the collection and `httpie-environment-local.json` into the same HTTPie space, then select **Local**. URLs use `{{baseUrl}}`; set the secret `{{token}}` after login for bearer auth.

## Troubleshooting

- **Build fails on theming-engine** — confirm `theming-engine/` is a sibling of `giftistry-bun/`.
- **JWT boot error** — set a strong `JWT_SECRET` (≥ 32 chars), provide `JWT_SECRET_FILE` / credentials directory, or ensure the state dir is writable for auto-persist (`GIFTISTRY_STATE_DIR`). `GIFTISTRY_AUTO_JWT_SECRET=false` requires an explicit secret.
- **WebSocket errors** — reverse proxy must forward `/ws/` with `Upgrade` headers.
- **Setup blocked** — check `GIFTISTRY_ALLOW_SETUP`, `config.json` → `AllowSetup`, and whether a user already exists. The server owner can re-enable setup under **Settings → Admin → Server** (Danger zone). Env `GIFTISTRY_ALLOW_SETUP=false` still overrides that. For headless recovery: `bun run giftistry-admin -- set-allow-setup true`.
- **Playwright on NixOS** — see [architecture.md](architecture.md#nixos-note).
