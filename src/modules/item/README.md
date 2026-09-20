# `modules/item`

Wishlist items: CRUD, claims, substitutions, links/related, metadata scrape, AI enrich/summarize hooks.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Item entity, visibility, claim summaries, export parsers, scraper/AI ports |
| `application/` | Add/update/delete, claims, substitutions, sync links/related, extract metadata |
| `infrastructure/` | Postgres item repos, scraping pipeline, Gemini/AI adapters, image fetch |
| `presentation/` | `item.routes.ts` |

## Public surface

- **Module:** `createItemModule`
- **Routes:** `/api/wishlists/:listId/items`, `/api/items/:itemId/*`
- **Ports:** `MetadataScraper`, `MetadataPopulator`, `DescriptionSummarizer`, etc.

## Hotspots

| Area | Role |
|------|------|
| `infrastructure/scraping/` | Tiered fetch → Playwright scrape; retailer extractors |
| `application/*-substitution*` | Owner-approved vs claimer-custom substitutions |
| `domain/parse-giftistry-export-*` | Import parsers (csv/md/txt/json) |

Scraping architecture and env vars: [docs/architecture.md](../../../docs/architecture.md#metadata-scraper).

## Related

- [↑ modules](../README.md)  
- [wishlist](../wishlist/README.md)  
- [jobs](../jobs/README.md)
