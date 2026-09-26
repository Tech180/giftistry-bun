# `modules/notifications`

In-app notifications, preferences, and push delivery (Web Push / FCM / ntfy).

Compact module — use cases live under `application/` (no behavior slices). Cross-module imports should use the public barrel `@/modules/notifications`.

## Layers

| Folder | Role |
|--------|------|
| `index.ts` | Public barrel (ports, create/delivery use cases, WS helpers, module factory) |
| `domain/` | Entity, interfaces, types, constants, utils, ports |
| `application/` | Use cases, register-push helpers, push delivery |
| `infrastructure/` | Repositories, adapters, registries, event handlers, row mappers |
| `presentation/` | Route composer + inbox / preferences / push route groups |

## Public surface

- **Barrel:** `@/modules/notifications`
- **Module:** `createNotificationsModule`
- **Routes:** `/api/notifications`, preferences, push register
- **Realtime:** `notification.received` over user WebSocket

## Notes

- Preference gating lives in `notification-preference.util.ts`.
- Event handlers under `infrastructure/event-handlers/` create notifications from domain events.

## Related

- [↑ modules](../README.md)  
- [jobs](../jobs/README.md) (completion notify)  
- [system](../system/README.md) (public push config / ntfy test)
