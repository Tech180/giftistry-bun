# `boot/`

Process boot helpers shared by `src/index.ts` and `src/worker.ts`.

## Role

1. Construct **infrastructure adapters** (Postgres, AI, WS, push, etc.) — `wire-adapters.ts`
2. Wire **realtime publishers** (jobs progress, list-changed, comments, notifications) to either:
   - **Direct** WebSocket publish on the API process, or  
   - **Postgres NOTIFY** fanout when running a separate worker

   `list.changed` publishes to both `listId` (authenticated wishlist WS) and `guest-list:{listId}` (invite guest WS).
3. Compose the **HTTP/WS app** — `create-http-app.ts` (CORS, swagger, envelope `mapResponse`, modules, WS plugins, `/health`)
4. Run the **job worker** — `run-worker.ts` (DB ping, Postgres fanout publishers, runner, shutdown)

Module factories (`*.module.ts`) must **not** call `new` on adapters; they receive ports from `app.container.ts` via `createInfrastructureAdapters()`.

## Files

| File | Role |
|------|------|
| `wire-adapters.ts` | `createInfrastructureAdapters()` — all concrete driven adapters |
| `runtime-publishers.ts` | `wireDirectRealtimePublishers` / `wirePostgresRealtimePublishers` / `clearRealtimePublishers` |
| `create-http-app.ts` | `createHttpApp(deps)` — Elysia composition for the API entry |
| `run-worker.ts` | `runWorker()` — worker process body used by `src/worker.ts` |
| `websocket/wishlist-ws.plugin.ts` | Wishlist room WS (auth, presence, typing) |
| `websocket/user-ws.plugin.ts` | Per-user notification WS |
| `websocket/invite-ws.plugin.ts` | Guest invite preview WS (`/ws/invite/:token`) |
| `utils/` | Envelope, CORS origin, headers, presence, worker shutdown |
| `interfaces/` | App container, HTTP deps, realtime publisher adapters, etc. |

Publishers themselves live in module `infrastructure/` (e.g. `WebsocketJobProgressPublisher`); boot only constructs and injects them.

## Related

- [↑ src](../README.md)  
- [jobs](../modules/jobs/README.md)  
- [worker entry](../worker.ts)
