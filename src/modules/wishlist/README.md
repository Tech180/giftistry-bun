# `modules/wishlist`

Wishlists (lists), shares, priorities, export/PDF, rollover/duplicate, WS presence.

Cross-module imports should use the public barrel `@/modules/wishlist`. Composition may deep-import infrastructure.

## Layers

| Folder | Role |
|--------|------|
| `index.ts` | Public barrel |
| `interfaces/` | `WishlistModuleDeps` |
| `domain/` | Entity, interfaces, types, utils, ports (access, shares, publisher) |
| `slices/` | Vertical behavior use cases (lists, shares, priorities, export, rollover, access) |
| `application/ports/` | Published ports only (`PdfGenerator`, `ThemeResolver`) |
| `infrastructure/` | `repositories/`, `adapters/`, `stores/`, row interfaces, utils |
| `presentation/` | Route composer + lists / priorities / shares / export / invites groups |

## Slices

| Slice | Owns |
|-------|------|
| `lists` | create/get/list/update/delete, activate/deactivate, expired |
| `shares` | list/update/remove shares, bulk share |
| `priorities` | create/list/delete priorities |
| `export` | CSV/XLSX/TXT/JSON + PDF export |
| `rollover` | rollover + duplicate wishlist |
| `access` | `CheckListAccessUseCase` (shared with list-access middleware) |

## Public surface

- **Module:** `createWishlistModule`, `createCheckListAccessUseCase`
- **Routes:** `/api/wishlists`, priorities, shares, export, PDF, invites
- **Realtime:** list-changed fanout; presence via wishlist WS registry
- **Events:** `WishlistSharedEvent`

## Related

- [↑ modules](../README.md)  
- [item](../item/README.md)  
- [invites](../invites/README.md)
