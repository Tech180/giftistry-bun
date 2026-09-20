# `modules/invites`

List link invites and email invites — create/list/revoke (via wishlist routes) and accept endpoints.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Invite entities, link-token + email-invite ports |
| `application/` | Create/list/revoke link & email invites, accept, public link preview |
| `infrastructure/` | Postgres invite repos |
| `presentation/` | `invites.routes.ts` (accept + preview); create routes mounted from wishlist when module present |

## Public surface

- **Module:** `createInvitesModule` → accept routes + `InvitesUseCases`
- **Accept:** `/api/invites/link/:token/accept`, `/api/invites/email/:token/accept`

## Related

- [↑ modules](../README.md)  
- [wishlist](../wishlist/README.md)
