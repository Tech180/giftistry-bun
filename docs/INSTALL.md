# Installing Giftistry

Giftistry ships as two repositories:

| Component | Repository | Role |
|-----------|------------|------|
| API | `giftistry-bun` | Bun/Elysia backend, PostgreSQL, background jobs |
| Web | `giftistry-react` | React SPA |

For themes and CSS compilation, the API also expects a sibling **`theming-engine`** checkout next to `giftistry-bun`.

---

## Option A — Docker Compose (recommended)

Everything runs from `giftistry-bun/deploy/`. Docker build context is the **parent folder** that contains `giftistry-bun/`, `giftistry-react/`, and `theming-engine/`.

### Prerequisites

- Docker Engine 24+ with Compose v2
- Cloned repos laid out like:

```text
projects/
  giftistry-bun/
  giftistry-react/
  theming-engine/
```

### Quick start

```bash
cd giftistry-bun/deploy
cp .env.example .env
cp config/config.example.json config/config.json
# Edit .env — set PGPASSWORD and JWT_SECRET (≥ 32 chars)
docker compose up -d --build
```

Open **http://localhost:8080** (or your `WEB_PORT`) and complete first-run setup.

### Services

| Service | Description |
|---------|-------------|
| `postgres` | PostgreSQL 16 with persistent volume |
| `api` | Giftistry API (Bun, port 3001 internal) |
| `web` | nginx serving the SPA; proxies `/api`, `/ws`, `/docs`, `/health` to the API |
| `mailpit` | Optional SMTP catcher (profile `mail`) |

### Optional Mailpit

```bash
docker compose --profile mail up -d
```

- Web UI: http://localhost:8025  
- SMTP: `mailpit:1025` inside the stack (already the API default when using compose)

### Configuration & secrets

**Runtime config file** — mounted at `/etc/giftistry/config.json`:

```bash
# host path → container path (see docker-compose.yml)
deploy/config/config.json
```

Override path with `GIFTISTRY_CONFIG_PATH` on the API service.

**JWT secret** (production required, ≥ 32 characters). Provide **one** of:

| Method | Example |
|--------|---------|
| Environment | `JWT_SECRET=…` in `.env` |
| File | `JWT_SECRET_FILE=/run/secrets/jwt_secret` |
| Credentials directory | `CREDENTIALS_DIRECTORY=/run/secrets` with file `JWT_SECRET` |

`CREDENTIALS_DIRECTORY` / `GIFTISTRY_CREDENTIALS_DIRECTORY` also supports `SMTP_PASS`, `PGPASSWORD`, `GIFTISTRY_SETUP_TOKEN`, and other named secrets.

**Other useful env vars** (see `.env.example`):

- `GIFTISTRY_PUBLIC_APP_URL` — public SPA URL (emails, WebAuthn, OAuth)
- `GIFTISTRY_ALLOW_SETUP` — allow first-run setup when no users exist
- `GIFTISTRY_SETUP_TOKEN` — optional token required for `POST /setup`

### Admin CLI (host or exec)

From the API repo with database env pointing at the stack:

```bash
cd giftistry-bun
export PGHOST=127.0.0.1 PGUSER=giftistry PGPASSWORD=… PGDATABASE=giftistry
# If postgres is not published, exec into the api container instead:
# docker compose -f deploy/docker-compose.yml exec api bun run giftistry-admin -- list-users

bun run giftistry-admin -- list-users
bun run giftistry-admin -- reset-admin-password --username admin
bun run giftistry-admin -- disable-password-login --confirm
bun run giftistry-admin -- set-allow-setup false
```

The CLI refuses `PGDATABASE=giftistry_test` unless `--force` is passed.

### Useful commands

```bash
cd giftistry-bun/deploy
docker compose logs -f api
docker compose down
docker compose down -v   # removes volumes — deletes all data
```

---

## Option B — NixOS (declarative)

For NixOS hosts, use the flake at:

```text
/etc/nixos/flakes/giftistry
```

That flake defines systemd services, PostgreSQL, nginx reverse proxy, and secret handling via `CREDENTIALS_DIRECTORY` — mirroring the Docker layout above.

Typical workflow on NixOS:

```bash
sudo nix flake update /etc/nixos/flakes/giftistry
sudo nixos-rebuild switch
```

Consult the flake README for module options (`services.giftistry.*`), credential paths, and backup notes.

---

## Development (without Docker)

**API**

```bash
cd giftistry-bun
bun install
bun run dev          # builds theming-engine, hot reload on :3001
```

**Web**

```bash
cd giftistry-react
bun install
bun run dev          # Vite on :3000, API default http://localhost:3001
```

**Both**

```bash
cd giftistry-bun && bun run dev:all
```

Ensure PostgreSQL is running locally and `config.json` exists (copy from `deploy/config/config.example.json` as a starting point).

---

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | API liveness (via nginx at `/health` in compose) |
| `GET /docs` | OpenAPI / Swagger UI |

---

## Troubleshooting

- **Build fails on theming-engine** — confirm `theming-engine/` is a sibling of `giftistry-bun/` and compose build context is the parent directory.
- **JWT boot error** — set a strong `JWT_SECRET` (≥ 32 chars) or mount `JWT_SECRET` via credentials directory.
- **WebSocket errors** — nginx must proxy `/ws/` with `Upgrade` headers (included in `deploy/docker/nginx.conf`).
- **Setup blocked** — check `GIFTISTRY_ALLOW_SETUP`, `config.json` → `AllowSetup`, and whether a user already exists.
