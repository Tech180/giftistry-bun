# `boot/`

Process boot helpers shared by `src/index.ts` and `src/worker.ts`.

## Role

Wire **realtime publishers** (jobs progress, list-changed, comments, notifications) to either:

- **Direct** WebSocket publish on the API process, or  
- **Postgres NOTIFY** fanout when running a separate worker

## Files

| File | Role |
|------|------|
| `runtime-publishers.ts` | `wireDirectRealtimePublishers` / `wirePostgresRealtimePublishers` / `clearRealtimePublishers` |

Publishers themselves live in module `infrastructure/` (e.g. `WebsocketJobProgressPublisher`); boot only injects the transport.

## Related

- [↑ src](../README.md)  
- [jobs](../modules/jobs/README.md)  
- [worker entry](../worker.ts)
