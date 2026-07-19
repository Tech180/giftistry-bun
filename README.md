# Giftistry API (Bun)

Backend for [Giftistry](https://github.com/) — a self-hosted wishlist app. This repo is designed for homelab deployment with explicit secrets handling, setup hardening, and production guards.

## Install

Choose one deployment path:

### Nix (recommended for homelab)

Use a Nix shell or flake dev environment for Bun, PostgreSQL, Chromium (Playwright scraping), and Mailpit (local SMTP):

```bash
nix-shell   # or: nix develop
bun install
bun run scripts/ensure-test-database.ts   # optional: local DB bootstrap
bun dev
```

See `docs/architecture.md` for Playwright/Chromium notes on NixOS.

### Docker

Run PostgreSQL and Mailpit via your compose stack, point env vars at those services, and start the API:

```bash
bun install
cp .env.example .env   # edit PG*, SMTP*, GIFTISTRY_*
bun start
```

Mount a volume for `config.json` (or set `GIFTISTRY_CONFIG_PATH`) so server settings persist across restarts.

## Development

```bash
bun install
bun dev          # hot reload
bun test         # test suite (uses isolated test DB)
```

## Environment variables

| Variable | Secret? | Description |
|----------|---------|-------------|
| `NODE_ENV` | no | `development` or `production` |
| `PORT` | no | HTTP port (default `3001`) |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` | no | PostgreSQL connection |
| `PGPASSWORD` | **yes** | Database password |
| `JWT_SECRET` | **yes** | Session signing key; required in production (≥32 chars) |
| `GIFTISTRY_PUBLIC_APP_URL` | no | Public browser URL (emails, CORS, WebAuthn). Falls back to `config.json` → `PublicAppUrl` |
| `GIFTISTRY_ALLOW_SETUP` | no | When `false`, blocks first-run setup even if no users exist (default `true`) |
| `GIFTISTRY_SETUP_TOKEN` | **yes** | When set, `POST /api/system/setup` requires `X-Giftistry-Setup-Token` header or `Setup.SetupToken` body |
| `GIFTISTRY_CONFIG_PATH` | no | Override path to `config.json` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_SECURE`, `SMTP_FROM` | no | Default/local SMTP |
| `SMTP_PASS` | **yes** | SMTP password |
| `OPENROUTER_API_KEY` | **yes** | Fallback OpenRouter key when slot key empty |
| `GEMINI_API_KEY` | **yes** | Fallback Gemini/OpenRouter key |
| `OAUTH_CLIENT_SECRET` | **yes** | OAuth client secret (issuer/id in config) |
| `CREDENTIALS_DIRECTORY` / `GIFTISTRY_CREDENTIALS_DIRECTORY` | — | Directory of files named after secret keys |

Non-secret values are read from `Bun.env`. Secrets use the **SecretSource** contract below.

## SecretSource contract

Secrets are resolved once at boot via `loadRuntimeConfig()` / `getEnv()`:

1. **`EnvSecretProvider`** — `Bun.env[NAME]` (trimmed)
2. **`FileEnvSecretProvider`** — contents of `NAME_FILE`
3. **`CredentialsDirectoryProvider`** — `$CREDENTIALS_DIRECTORY/NAME` or `$GIFTISTRY_CREDENTIALS_DIRECTORY/NAME`

`CompositeSecretSource` tries providers in that order; first non-empty value wins.

Registered secret names (`SECRET_NAMES`):

- `JWT_SECRET`
- `GIFTISTRY_SETUP_TOKEN`
- `SMTP_PASS`
- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`
- `OAUTH_CLIENT_SECRET`
- `PGPASSWORD`

Production boot **fails** if `JWT_SECRET` is missing, too short, or a known weak default.

## Production hardening

- **CORS**: In production, only origins matching `GIFTISTRY_PUBLIC_APP_URL` (same origin or hostname) are allowed.
- **Public URL warning**: If production starts without a resolvable public URL, a boot warning is logged.
- **Setup token**: Optional install token for the setup wizard.
- **Password policy**: Minimum 8 characters with at least one letter and one number (signup, setup admin, admin user create/reset).

Server-level settings (SMTP remote, AI, OAuth, `PublicAppUrl`) are stored in `config.json` and managed via `/api/system/settings` after the first admin exists.

## License

See repository license.
