# `modules/notifications`

In-app notifications, preferences, and push delivery (Web Push / FCM / ntfy).

## Layers

| Folder | Role |
|--------|------|
| `domain/` | Notification entity, prefs, push subscription, publisher / push ports |
| `application/` | Create/list/read/delete notifications, prefs, push registration, delivery service |
| `infrastructure/` | Postgres repos, WS realtime publisher, FCM / web-push / ntfy adapters |
| `presentation/` | `notifications.routes.ts` |

## Public surface

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
