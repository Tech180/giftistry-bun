# `modules/wishlist`

Wishlists (lists), shares, priorities, export/PDF, rollover/duplicate, WS presence.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Wishlist entity, list access, shares, rollover/duplicate title utils, publisher ports |
| `application/` | CRUD, activate/deactivate, shares, export, PDF, rollover, duplicate |
| `infrastructure/` | Postgres wishlist/share repos, PDF generator, WS list-changed + presence |
| `presentation/` | `wishlist.routes.ts` (+ optional invite routes when invites module present) |

## Public surface

- **Module:** `createWishlistModule`
- **Routes:** `/api/wishlists`, priorities, shares, export, PDF
- **Realtime:** list-changed fanout; presence via wishlist WS registry

## Hotspots

| Area | Role |
|------|------|
| `infrastructure/pdf-lib-generator.ts` | Styled PDF export |
| `application/export-wishlist-data.use-case.ts` | CSV / XLSX / TXT / JSON |
| `domain/list-access.service.ts` | Role resolution for list/item targets |

## Related

- [↑ modules](../README.md)  
- [item](../item/README.md)  
- [invites](../invites/README.md)
