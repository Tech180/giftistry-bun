# `modules/friends`

Friends graph: requests, accept/decline/cancel, unfriend, user search.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Friend entities, request ports, domain events |
| `application/` | List friends/requests, send/accept/decline/cancel, unfriend, search |
| `infrastructure/` | Postgres friend + request repos |
| `presentation/` | `friends.routes.ts` |

## Public surface

- **Module:** `createFriendsModule`
- **Routes:** `/api/friends`, `/api/friends/requests`, `/api/users/search`

## Related

- [↑ modules](../README.md)  
- [auth](../auth/README.md)  
- [wishlist](../wishlist/README.md) (bulk share with friends)
