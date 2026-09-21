<h1 align="center">Giftistry API</h1>

<p align="center">
  <strong>Self-hosted wishlists that stay private, shareable, and actually useful.</strong>
</p>

<p align="center">
  <a href="#"><img alt="License" src="https://img.shields.io/badge/license-TODO-blue.svg" /></a>
  <a href="#"><img alt="Status" src="https://img.shields.io/badge/status-early%20access-orange.svg" /></a>
  <a href="#"><img alt="Bun" src="https://img.shields.io/badge/bun-1.x-f9f1e1.svg" /></a>
  <a href="#"><img alt="Elysia" src="https://img.shields.io/badge/elysia-1.x-black.svg" /></a>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#documentation">Docs</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

Giftistry helps people collect gifts, share lists with friends and family, and coordinate claims — without stuffing your data into someone else's SaaS. This repository is the **Bun/Elysia API**; pair it with [giftistry-react](../giftistry-react) for a full stack.

Designed for homelab deployment: explicit secrets handling, setup hardening, and production guards.

## Features

| | |
| :--- | :--- |
| **Wishlists** | Create lists, shares, invites, export/PDF, rollover & duplicate |
| **Items** | Claims, substitutions, linked/related items, metadata scrape + AI enrich |
| **Jobs** | Background import / enrich / summarize with realtime progress |
| **Auth** | JWT sessions, passkeys, 2FA, OIDC, themes |
| **Notifications** | In-app + Web Push / FCM / ntfy |
| **Privacy-first** | Self-host the stack; you keep the data |

## Getting started

**Self-host (Docker / NixOS):** use the packaging repo [`giftistry`](../giftistry) — [Compose](../giftistry/docs/install/docker.md) or [`services.giftistry`](../giftistry/docs/install/nixos.md).

### Local API development

```bash
# Prefer the packaging nix develop shell for local Postgres:
#   cd ../giftistry/nix && nix develop
bun install
cp .env.example .env   # edit PG*, SMTP*, GIFTISTRY_*
cp config/config.example.json config.json
bun run scripts/ensure-test-database.ts   # optional local DB bootstrap
bun run dev                               # hot reload (API + jobs, role=all)
```

OpenAPI: `http://localhost:3001/docs`.

For scripts, tests, and process roles, see [docs/development.md](docs/development.md). Install paths: [docs/INSTALL.md](docs/INSTALL.md).

## Documentation

| Doc | What it's for |
| --- | --- |
| [Architecture](docs/architecture.md) | DDD layers, ports, scraper, CI rules |
| [Development](docs/development.md) | Scripts, verify, env, split API/worker |
| [Install](docs/INSTALL.md) | Packaging repo, local Bun, secrets |
| [Contributing](CONTRIBUTING.md) | PRs, layer rules, review expectations |
| [Source map](src/README.md) | Nested folder READMEs under `src/` |

## Stack

- **Runtime:** Bun  
- **HTTP:** Elysia (+ CORS, Swagger)  
- **DB:** PostgreSQL (`postgres` driver)  
- **Jobs / realtime:** in-process runner + Postgres LISTEN/NOTIFY + WebSockets  
- **Language:** TypeScript (strict, `noUncheckedIndexedAccess`)

## Environment & secrets

Non-secrets come from `Bun.env`. Secrets go through **SecretSource** (`getEnv()` / `loadRuntimeConfig()`):

1. `EnvSecretProvider` — `Bun.env[NAME]`
2. `FileEnvSecretProvider` — `NAME_FILE`
3. `CredentialsDirectoryProvider` — `$CREDENTIALS_DIRECTORY/NAME`

Registered names: `JWT_SECRET`, `GIFTISTRY_SETUP_TOKEN`, `SMTP_PASS`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OAUTH_CLIENT_SECRET`, `PGPASSWORD`.

Production boot **fails** if `JWT_SECRET` is weak/missing or no public app URL is configured. Details: [docs/development.md](docs/development.md#environment-variables).

## Contributing

Ideas, bugs, and PRs are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then skim [docs/architecture.md](docs/architecture.md) so new code lands in the right layer.

## License

TODO — add your license (e.g. AGPL / MIT / proprietary) and link the full text.
