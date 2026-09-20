# `collections/`

HTTPie Desktop collection generated from live OpenAPI (`GET /docs/json`) plus a curated request overlay.

## Usage

```bash
bun run collections:generate
```

Import into the same HTTPie space:

- `httpie-collection-giftistry.json`
- `httpie-environment-local.json` (select **Local**)

Set secret `{{token}}` after login. Requests use `{{baseUrl}}` (default `http://localhost:3001`).

## Layout

| File | Role |
|------|------|
| `generate-httpie-collection.ts` | Generator entry |
| `openapi-to-request-defs.ts` | OpenAPI → request defs |
| `request-overlay.ts` | Curated example bodies / tweaks |
| `public-routes.ts` | Routes that skip bearer auth |
| `*.test.ts` | Coverage / format guards |

Regenerate after adding or changing routes. Coverage tests assert the export stays in sync with OpenAPI.

## Related

- [docs/development.md](../docs/development.md)  
- [↑ Root README](../README.md)
