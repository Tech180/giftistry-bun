# `modules/jobs`

Background jobs: wishlist import, item enrich, item summarize — plus progress fanout and completion notify.

## Layers

| Folder | Role |
|--------|------|
| `domain/` | `BackgroundJob` entity, progress rate utils, job repo / progress publisher ports |
| `application/` | Start/run jobs, runner, completion notifications, public job views |
| `infrastructure/` | Postgres job repo, WS progress publisher, Postgres realtime listener |
| `presentation/` | `jobs.routes.ts` |

## Public surface

- **Module:** `createJobsModule` → routes + `BackgroundJobRunner` + job repo
- **Routes:** start import/enrich/summarize, list mine/admin, cancel, list jobs by wishlist
- **Worker:** `src/worker.ts` claims queued jobs; API may listen for NOTIFY fanout

## Notes

- Process role `worker` runs the runner without HTTP; `api` serves HTTP and may listen for fanout.
- Publishers are wired in `src/boot/runtime-publishers.ts`.

## Related

- [↑ modules](../README.md)  
- [item](../item/README.md)  
- [boot](../../boot/README.md)
