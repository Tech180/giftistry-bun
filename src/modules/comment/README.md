# `modules/comment`

Wishlist comments, reactions, visibility, and realtime comment events.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Comment entity, visibility service, comment repo + realtime publisher ports |
| `application/` | List/add/delete comments, toggle reaction |
| `infrastructure/` | Postgres comment repo, websocket realtime publisher |
| `presentation/` | `comment.routes.ts` |

## Public surface

- **Module:** `createCommentModule`
- **Routes:** `/api/wishlists/:listId/comments`, react, delete

## Notes

- Delivery/visibility respects owner-visible flags and audience lists (`should-deliver-comment-event`).

## Related

- [↑ modules](../README.md)  
- [wishlist](../wishlist/README.md)  
- [notifications](../notifications/README.md)
