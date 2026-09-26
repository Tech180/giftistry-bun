# `modules/item`

Wishlist items: CRUD, claims, substitutions, links/related, metadata scrape, AI enrich/summarize, import, group funding.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Item entity + interfaces/types/utils/constants/ports; visibility, claim summaries, scraper/AI ports, `ItemRemovedEvent` |
| `slices/` | Vertical behavior use cases |
| `application/` | Published ports + `UseCases` facade |
| `infrastructure/` | Postgres repos, scraping pipeline, AI adapters, image fetch |
| `presentation/` | Thin route composer + `routes/` / `schemas/` / `utils/` |
| `index.ts` | Public barrel |

## Slices

| Slice | Owns |
|-------|------|
| `catalog` | add/update/delete/list, field definitions, audience visibility |
| `claims` | claim/unclaim (+ linked), projections, item-removed notify |
| `substitutions` | owner/claimer substitution CRUD and reorder |
| `links` | add link, sync links/related |
| `metadata` | extract/enrich/summarize/reviews/backfill/promote image |
| `import` | parse preview, bulk add |
| `funding` | group-fund comment + contributor notify |

## Public surface

- **Module:** `createItemModule`
- **Routes:** `/api/wishlists/:listId/items`, `/api/items/:itemId/*`
- **Ports:** `ListItemsPort`, `ItemEnricherPort`, `ItemSummarizerPort`, `ItemImporterPort`, `ItemJobSupportPort`, `ListReviewBackfillPort`
- **Events:** `ItemRemovedEvent` (`item.removed`) — claimers notified via event bus

## Related

- [↑ modules](../README.md)  
- [wishlist](../wishlist/README.md)  
- [jobs](../jobs/README.md)
