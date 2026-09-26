# `modules/invites`

List link invites and email invites — create/list/revoke (via wishlist routes) and accept endpoints.

Compact module — use cases live under `application/` (no behavior slices). Cross-module imports should use the public barrel `@/modules/invites`.

## Layers

| Folder | Role |
|--------|------|
| `index.ts` | Public barrel (ports, entities, events, InvitesUseCases, module factory) |
| `domain/` | Invite interfaces, ports, events |
| `application/` | Create/list/revoke link & email invites, accept, public link preview |
| `infrastructure/` | Repositories, row mappers, SQL select constants, guest WS store/adapters |
| `presentation/` | Routes, schemas (`invites.routes.ts` composer) |

## Public surface

- **Barrel:** `@/modules/invites`
- **Module:** `createInvitesModule` → accept routes + `InvitesUseCases`
- **Accept:** `/api/invites/link/:token/accept`, `/api/invites/email/:token/accept`
- **Guest preview:** `GET/POST /api/invites/link/:token/preview` (includes `SupportsGuestRealtime: true`)
- **Guest realtime:** `/ws/invite/:token` (boot plugin) — open links subscribe immediately; password links send `{ Type: "auth", Password }` first. Receives `list.changed` on topic `guest-list:{listId}`. Revoke sends `{ Type: "invite.revoked" }` then closes.

`list.changed` fanout (boot `runtime-publishers`) publishes to both the authenticated wishlist room (`listId`) and `guest-list:{listId}`.

## Related

- [↑ modules](../README.md)  
- [wishlist](../wishlist/README.md)
- [boot websocket](../../boot/README.md)
