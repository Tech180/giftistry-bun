# Installing Giftistry

Giftistry ships as two repositories:

| Component | Repository | Role |
|-----------|------------|------|
| API | `giftistry-bun` | Bun/Elysia backend, PostgreSQL, background jobs |
| Web | `giftistry-react` | React SPA |

For themes and CSS compilation, the API also expects a sibling **`theming-engine`** checkout next to `giftistry-bun`.

```text
projects/
  giftistry-bun/
  giftistry-react/
  theming-engine/
```

---

## Option A — NixOS (recommended for homelab)

For NixOS hosts, use the flake at:

```text
/etc/nixos/flakes/giftistry
```

That flake defines systemd services, PostgreSQL, nginx reverse proxy, and secret handling via `CREDENTIALS_DIRECTORY`.

Typical workflow:

```bash
sudo nix flake update /etc/nixos/flakes/giftistry
sudo nixos-rebuild switch
```

Consult the flake README for module options (`services.giftistry.*`), credential paths, and backup notes.

---

## Option B — Local Bun + PostgreSQL

### Prerequisites

- Bun 1.x
- PostgreSQL 16+
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

**JWT secret** (production required, ≥ 32 characters). Provide **one** of:

| Method | Example |
|--------|---------|
| Environment | `JWT_SECRET=…` in `.env` |
| File | `JWT_SECRET_FILE=/path/to/jwt_secret` |
| Credentials directory | `CREDENTIALS_DIRECTORY=/run/credentials/…` with file `JWT_SECRET` |

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
- **JWT boot error** — set a strong `JWT_SECRET` (≥ 32 chars) or provide it via `JWT_SECRET_FILE` / credentials directory.
- **WebSocket errors** — reverse proxy must forward `/ws/` with `Upgrade` headers.
- **Setup blocked** — check `GIFTISTRY_ALLOW_SETUP`, `config.json` → `AllowSetup`, and whether a user already exists. The server owner can re-enable setup under **Settings → Admin → Server** (Danger zone). Env `GIFTISTRY_ALLOW_SETUP=false` still overrides that. For headless recovery: `bun run giftistry-admin -- set-allow-setup true`.
- **Playwright on NixOS** — see [architecture.md](architecture.md#nixos-note).
