# `modules/comment`

Wishlist comments, reactions, visibility, and realtime comment events.

Compact module — use cases live under `application/` (no behavior slices). Cross-module imports should use the public barrel `@/modules/comment`.

## Layers

| Folder | Role |
|--------|------|
| `index.ts` | Public barrel (ports, entities, use-case facade, module factory) |
| `domain/` | Comment entity, visibility utils, comment repo + realtime publisher ports |
| `application/` | List/add/delete comments, toggle reaction |
| `infrastructure/` | Repositories, realtime adapter, row mappers |
| `presentation/` | Routes, schemas, mappers (`comment.routes.ts` composer) |

## Public surface

- **Barrel:** `@/modules/comment`
- **Module:** `createCommentModule`
- **Routes:** `/api/wishlists/:listId/comments`, react, delete

## Notes

- Delivery/visibility respects owner-visible flags and audience lists (`should-deliver-comment-event`).

## Related

- [↑ modules](../README.md)  
- [wishlist](../wishlist/README.md)  
- [notifications](../notifications/README.md)
