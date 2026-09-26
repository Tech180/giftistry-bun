# `modules/friends`

Friends graph: requests, accept/decline/cancel, unfriend, user search.

Compact module — use cases live under `application/` (no behavior slices). Cross-module imports should use the public barrel `@/modules/friends`.

## Layers

| Folder | Role |
|--------|------|
| `index.ts` | Public barrel (ports, entities, events, module factory) |
| `domain/` | Friend/request interfaces, entity, ports, events |
| `application/` | List friends/requests, send/accept/decline/cancel, unfriend, search |
| `infrastructure/` | Repositories, row mappers, SQL select constants |
| `presentation/` | Routes, schemas (`friends.routes.ts` composer) |

## Public surface

- **Barrel:** `@/modules/friends`
- **Module:** `createFriendsModule`
- **Routes:** `/api/friends`, `/api/friends/requests`, `/api/users/search`

## Related

- [↑ modules](../README.md)  
- [auth](../auth/README.md)  
- [wishlist](../wishlist/README.md) (bulk share with friends)
