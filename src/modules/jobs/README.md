# `modules/jobs`

Background jobs: wishlist import, item enrich, item summarize — plus progress fanout and completion notify.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | `BackgroundJob` entity, progress rate utils, job repo / progress publisher ports |
| `slices/` | Start/run use cases per job type |
| `application/` | `BackgroundJobRunner`, completion notify, public job views, heartbeat helpers |
| `infrastructure/` | Postgres job repo, WS progress publisher, Postgres realtime listener |
| `presentation/` | `jobs.routes.ts` |
| `index.ts` | Public barrel |

## Slices

| Slice | Owns |
|-------|------|
| `import` | start + run wishlist import job |
| `enrich` | start + run item enrich (grab-info) job |
| `summarize` | start + run item summarize job |

## Public surface

- **Module:** `createJobsModule` → routes + `BackgroundJobRunner` + job repo
- **Routes:** start import/enrich/summarize, list mine/admin, cancel, jobs by wishlist
- **Worker:** `src/worker.ts` claims queued jobs; API may listen for NOTIFY fanout

## Notes

- Process role `worker` runs the runner without HTTP; `api` serves HTTP and may listen for fanout.
- Publishers are wired in `src/boot/runtime-publishers.ts`.
- Job runners call into item published ports (`ItemEnricherPort`, etc.), not item infrastructure.

## Related

- [↑ modules](../README.md)  
- [item](../item/README.md)  
- [boot](../../boot/README.md)
