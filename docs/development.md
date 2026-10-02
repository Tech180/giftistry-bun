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
| `bun run canary:scrape` | Live scrape canary against public product URLs (network + Playwright) |
| `bun run eval:scrape` | Offline HTML corpus replay under `tests/fixtures/scraping/corpus/` |
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

### Live scrape canary

The canary script exercises the real `MetadataScraperOrchestrator` against stable public URLs listed in `tests/fixtures/scraping/canary-urls.json`. It runs with concurrency **2**, checks optional `titleContains` / price bounds, prints pass/fail grouped by host, and exits **non-zero** when the scored pass rate falls below `minPassRate` (negative `expectFailure` entries are scored separately).

```bash
bun run canary:scrape
# custom fixture:
bun scripts/scrape-canary.ts --fixture=tests/fixtures/scraping/canary-urls.json
```

Requires outbound HTTPS and Chromium (same as production scraping). Tune `SCRAPE_*` env vars if fetches time out.

**Cron (hourly example)** — run from the repo root as the deploy user; mail on failure:

```cron
0 * * * * cd /opt/giftistry-bun && /usr/bin/bun run canary:scrape >> /var/log/giftistry-scrape-canary.log 2>&1 || echo "scrape canary failed" | mail -s "giftistry scrape canary" ops@example.com
```

**systemd timer** — service + timer units (adjust paths and `User=`):

```ini
# /etc/systemd/system/giftistry-scrape-canary.service
[Unit]
Description=Giftistry live scrape canary

[Service]
Type=oneshot
WorkingDirectory=/opt/giftistry-bun
Environment=NODE_ENV=production
ExecStart=/usr/bin/bun run canary:scrape
User=giftistry

# /etc/systemd/system/giftistry-scrape-canary.timer
[Unit]
Description=Hourly Giftistry scrape canary

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

Enable with `systemctl enable --now giftistry-scrape-canary.timer`. Check logs via `journalctl -u giftistry-scrape-canary.service`.

### Client-captured product pages

When server fetch is blocked (bot gate, geo, etc.), an authenticated client may POST captured retailer HTML:

- **Route:** `POST /api/items/metadata/capture-page`
- **Body:** `Giftistry.Items.Url`, `Giftistry.Items.Html` (required, ≤ ~2 MiB UTF-8), optional `CapturedJson`, optional `ListId` for category context
- **Behavior:** `IngestCapturedPageUseCase` → `ExtractMetadataUseCase` with `capture` (no server fetch). Response mirrors enrich job fields (`Title`, `Diagnostics.NeedsReview`, `Diagnostics.FieldSources`, …).
- Treat submitted HTML as untrusted; SSRF-safe URL validation still applies to `Url`.

Admin scrape telemetry reporting is stubbed at `GET /api/admin/scrape-stats` → `{ Available: false }` until events are persisted.

When a scraped product image is promoted into `Item.Photos`, the API emits **`list.changed`** (`item.updated`) on the wishlist WebSocket room so open list views (and guest preview realtime) can refetch items and show thumbnails without a full page reload.

### Scraping tips

- A scrape that runs long is bounded by `SCRAPE_TOTAL_BUDGET_MS` (default: fetch + Playwright timeouts + 10s). Telemetry splits `scrapeDurationMs` from `aiDurationMs`, so slow AI stages no longer look like slow scrapes. If `[AI Populate] Populate JSON failed after retry` appears, its `kind` / `finishReason` / `maxTokens` fields say whether the reply was truncated (raise `AiPopulateMaxTokens`) or malformed (try a larger model or the `fast` preset).

- **Corpus snapshots** under `tests/fixtures/scraping/corpus/` are trimmed third-party HTML saved for internal scraper regression tests only. Do not treat them as licensed content for redistribution; prefer synthetic or redacted captures when adding entries (`bun scripts/scrape-corpus-capture.ts`).
- Prefer canonical retailer URLs (e.g. `https://www.amazon.com/dp/…`) over short links (`a.co`, `amzn.to`) when pasteable — short links often hit a “Continue shopping” gate.
- Amazon enrich may skip the HTTP fetch tier and use Playwright (canonical `/dp/{ASIN}` first when ASIN is in the URL). If Amazon still serves a bot/captcha gate, AI populate is **fail-closed**: thin URL/ASIN context alone is not enough — web search must corroborate the AI title, or extract rethrows the blocked scrape error (user enters metadata manually). See [architecture.md](architecture.md).
- Scrapes reject private/local URLs (SSRF guard). Fetch uses manual redirects with DNS checks per hop; Playwright aborts private-host requests.
- Soft block markers (“continue shopping”, “access denied”) no longer scan the full page body — strong product signals (title+price+image) win over soft markers.
- After upgrading, if blocked-link enrich still hallucinates from old prompt examples, reset **AI populate prompt** to defaults in server settings (persisted `AiPopulatePrompt` is not auto-migrated). An empty `AiPopulatePrompt` in `config.json` uses the current default. Gift-list titles are also normalized in code (`normalizeGiftFacingTitle`): emoji and `| Store Name` suffixes are removed even when the model echoes the page title.
- Manual repro for blocked AI trust: `bun run scripts/repro-blocked-amazon-extract.ts` (add `--with-web-search` when Playwright/`SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH` is available).

Use `getEnv()` from `src/common/config/utils/get-env.util.ts` for typed runtime config.

## Production hardening (quick)

- CORS limited to public app URL hostname in production
- Boot fails without public URL / strong `JWT_SECRET`
- Optional setup token for first-run wizard
- Password policy: min 8 chars, letter + number

Server settings (remote SMTP, AI, OAuth, `PublicAppUrl`) live in `config.json` via `/api/system/settings`.

### Extract / enrich AI gating

`ExtractMetadataUseCase` (item-enrich jobs, capture-page ingest, blocked link fallback) runs categorize/populate AI only when **all** of the following are on: server `AiEnabled` (with a configured fast AI slot), the acting user’s AI preference and `CanUseAiFeatures` policy, and—when `listId` is passed—the wishlist’s `AiEnabled`. If any gate is off, enrich returns scrape-only fields with `Diagnostics.AiPopulate: skipped`. Blocked retailer pages do not get an AI fallback when AI is disallowed; the blocked scrape error is rethrown instead.

### AI metadata extraction presets

Owner settings key `AiMetadataExtractionPreset` controls how `ExtractMetadataUseCase` builds AI prompts:

| Preset | Behavior |
|--------|----------|
| `full` (default) | Full populate hub + uncapped page context; single AI call |
| `fast` | Compact prompts, ~2k context / ~2k max tokens; single call |
| `balanced` | Compact prompts, ~4k context / ~4k max tokens; single call |
| `thorough` | Compact core call, then pack field call(s); better for small models + packs |

Optional overrides: `AiPageContextMaxChars`, `AiPopulateMaxTokens` (`0` = use preset default / no cap), `AiMetadataSplitPackCalls` (thorough only: one call per pack).

## Related

- [Architecture](architecture.md)
- [Install](INSTALL.md)
- [Source map](../src/README.md)
- [Contributing](../CONTRIBUTING.md)
