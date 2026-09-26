import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { BackgroundJobPayload } from '../../domain/interfaces/background-job-payload.type';
import type { BackgroundJobPhase } from '../../domain/interfaces/background-job-phase.type';
import type { BackgroundJobStatus } from '../../domain/interfaces/background-job-status.type';
import type { BackgroundJobRow } from '../interfaces/background-job-row.interface';

export function mapBackgroundJobRow(row: BackgroundJobRow): BackgroundJob {
  return {
    Id: String(row.id),
    Kind: row.kind as BackgroundJob['Kind'],
    ListId: row.list_id ? String(row.list_id) : null,
    UserId: String(row.user_id),
    Status: row.status as BackgroundJobStatus,
    Phase: row.phase as BackgroundJobPhase,
    ProgressDone: Number(row.progress_done ?? 0),
    ProgressTotal: Number(row.progress_total ?? 0),
    Message: String(row.message ?? ''),
    Error: row.error != null ? String(row.error) : null,
    Payload: (row.payload ?? {}) as BackgroundJobPayload,
    Result: (row.result ?? {}) as Record<string, unknown>,
    CreatedAt: row.created_at as Date | string,
    UpdatedAt: row.updated_at as Date | string,
    StartedAt: (row.started_at as Date | string | null) ?? null,
    FinishedAt: (row.finished_at as Date | string | null) ?? null,
  };
}
