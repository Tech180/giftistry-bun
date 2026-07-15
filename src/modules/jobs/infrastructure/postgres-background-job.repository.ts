import { sql } from '@/common/database/connection';
import type {
  BackgroundJob,
  BackgroundJobItem,
  BackgroundJobItemStatus,
  BackgroundJobPhase,
  BackgroundJobStatus,
  WishlistImportJobPayload,
} from '../domain/background-job.entity';
import type {
  BackgroundJobRepository,
  CreateBackgroundJobInput,
} from '../domain/ports/background-job.repository';

function mapJob(row: Record<string, unknown>): BackgroundJob {
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
    Payload: (row.payload ?? {}) as WishlistImportJobPayload,
    Result: (row.result ?? {}) as Record<string, unknown>,
    CreatedAt: row.created_at as Date | string,
    UpdatedAt: row.updated_at as Date | string,
    StartedAt: (row.started_at as Date | string | null) ?? null,
    FinishedAt: (row.finished_at as Date | string | null) ?? null,
  };
}

function mapItem(row: Record<string, unknown>): BackgroundJobItem {
  return {
    Id: String(row.id),
    JobId: String(row.job_id),
    ItemId: row.item_id ? String(row.item_id) : null,
    LinkUrl: row.link_url != null ? String(row.link_url) : null,
    Status: row.status as BackgroundJobItemStatus,
    Error: row.error != null ? String(row.error) : null,
    Payload: (row.payload ?? {}) as Record<string, unknown>,
    CreatedAt: row.created_at as Date | string,
    UpdatedAt: row.updated_at as Date | string,
  };
}

export class PostgresBackgroundJobRepository implements BackgroundJobRepository {
  async create(input: CreateBackgroundJobInput): Promise<BackgroundJob> {
    const [row] = await sql`
      INSERT INTO background_jobs (kind, list_id, user_id, status, phase, payload)
      VALUES (
        ${input.kind},
        ${input.listId ?? null},
        ${input.userId},
        'queued',
        'queued',
        ${sql.json(input.payload as never)}
      )
      RETURNING *
    `;
    return mapJob(row as Record<string, unknown>);
  }

  async findById(id: string): Promise<BackgroundJob | null> {
    const [row] = await sql`SELECT * FROM background_jobs WHERE id = ${id}`;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async findActiveByListId(listId: string): Promise<BackgroundJob | null> {
    const [row] = await sql`
      SELECT * FROM background_jobs
      WHERE list_id = ${listId}
        AND status IN ('queued', 'running', 'suspended')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async claimNextQueued(): Promise<BackgroundJob | null> {
    const rows = await sql`
      UPDATE background_jobs
      SET
        status = 'running',
        phase = CASE WHEN phase = 'queued' THEN 'parsing' ELSE phase END,
        started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM background_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `;
    const row = rows[0];
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async updateProgress(
    id: string,
    patch: {
      listId?: string | null;
      status?: BackgroundJobStatus;
      phase?: BackgroundJobPhase;
      progressDone?: number;
      progressTotal?: number;
      message?: string;
      error?: string | null;
      result?: Record<string, unknown>;
      startedAt?: Date | null;
      finishedAt?: Date | null;
    }
  ): Promise<BackgroundJob | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const [row] = await sql`
      UPDATE background_jobs
      SET
        list_id = ${patch.listId !== undefined ? patch.listId : current.ListId},
        status = ${patch.status ?? current.Status},
        phase = ${patch.phase ?? current.Phase},
        progress_done = ${patch.progressDone ?? current.ProgressDone},
        progress_total = ${patch.progressTotal ?? current.ProgressTotal},
        message = ${patch.message ?? current.Message},
        error = ${patch.error !== undefined ? patch.error : current.Error},
        result = ${sql.json((patch.result ?? current.Result) as never)},
        started_at = ${
          patch.startedAt !== undefined
            ? patch.startedAt
            : current.StartedAt
        },
        finished_at = ${
          patch.finishedAt !== undefined
            ? patch.finishedAt
            : current.FinishedAt
        },
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async requestCancel(id: string, userId: string): Promise<BackgroundJob | null> {
    const [row] = await sql`
      UPDATE background_jobs
      SET
        status = CASE
          WHEN status IN ('queued', 'running', 'suspended') THEN 'cancelled'
          ELSE status
        END,
        phase = CASE
          WHEN status IN ('queued', 'running', 'suspended') THEN 'cancelled'
          ELSE phase
        END,
        message = CASE
          WHEN status IN ('queued', 'running', 'suspended') THEN 'Cancelled'
          ELSE message
        END,
        finished_at = CASE
          WHEN status IN ('queued', 'running', 'suspended') THEN CURRENT_TIMESTAMP
          ELSE finished_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async requestCancelAny(id: string): Promise<BackgroundJob | null> {
    const [row] = await sql`
      UPDATE background_jobs
      SET
        status = CASE
          WHEN status IN ('queued', 'running', 'suspended') THEN 'cancelled'
          ELSE status
        END,
        phase = CASE
          WHEN status IN ('queued', 'running', 'suspended') THEN 'cancelled'
          ELSE phase
        END,
        message = CASE
          WHEN status IN ('queued', 'running', 'suspended') THEN 'Cancelled'
          ELSE message
        END,
        finished_at = CASE
          WHEN status IN ('queued', 'running', 'suspended') THEN CURRENT_TIMESTAMP
          ELSE finished_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND status IN ('queued', 'running', 'suspended')
      RETURNING *
    `;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async requestSuspend(id: string, userId: string): Promise<BackgroundJob | null> {
    const [row] = await sql`
      UPDATE background_jobs
      SET
        status = 'suspended',
        phase = 'suspended',
        message = 'Suspended',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND user_id = ${userId}
        AND status IN ('queued', 'running')
      RETURNING *
    `;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async requestSuspendAny(id: string): Promise<BackgroundJob | null> {
    const [row] = await sql`
      UPDATE background_jobs
      SET
        status = 'suspended',
        phase = 'suspended',
        message = 'Suspended',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND status IN ('queued', 'running')
      RETURNING *
    `;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async requestResume(id: string, userId: string): Promise<BackgroundJob | null> {
    const [row] = await sql`
      UPDATE background_jobs
      SET
        status = 'queued',
        phase = CASE WHEN phase = 'suspended' THEN 'queued' ELSE phase END,
        message = 'Resumed',
        finished_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND user_id = ${userId}
        AND status = 'suspended'
      RETURNING *
    `;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async requestResumeAny(id: string): Promise<BackgroundJob | null> {
    const [row] = await sql`
      UPDATE background_jobs
      SET
        status = 'queued',
        phase = CASE WHEN phase = 'suspended' THEN 'queued' ELSE phase END,
        message = 'Resumed',
        finished_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND status = 'suspended'
      RETURNING *
    `;
    return row ? mapJob(row as Record<string, unknown>) : null;
  }

  async cancelActiveByListId(listId: string): Promise<number> {
    const rows = await sql`
      UPDATE background_jobs
      SET
        status = 'cancelled',
        phase = 'cancelled',
        message = 'Cancelled — wishlist deleted',
        finished_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE list_id = ${listId}
        AND status IN ('queued', 'running', 'suspended')
      RETURNING id
    `;
    return rows.length;
  }

  async listActiveByUserId(userId: string): Promise<BackgroundJob[]> {
    const rows = await sql`
      SELECT * FROM background_jobs
      WHERE user_id = ${userId}
        AND status IN ('queued', 'running', 'suspended')
      ORDER BY created_at DESC
    `;
    return rows.map((row) => mapJob(row as Record<string, unknown>));
  }

  async listActiveAll(): Promise<BackgroundJob[]> {
    const rows = await sql`
      SELECT * FROM background_jobs
      WHERE status IN ('queued', 'running', 'suspended')
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return rows.map((row) => mapJob(row as Record<string, unknown>));
  }

  async reclaimStaleRunning(staleAfterMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - Math.max(0, staleAfterMs));
    const rows = await sql`
      UPDATE background_jobs
      SET
        status = 'queued',
        message = 'Recovered after server restart',
        updated_at = CURRENT_TIMESTAMP
      WHERE status = 'running'
        AND updated_at < ${cutoff}
      RETURNING id
    `;
    return rows.length;
  }

  async shouldStop(id: string): Promise<boolean> {
    const [row] = await sql`
      SELECT status FROM background_jobs WHERE id = ${id}
    `;
    const status = row?.status as string | undefined;
    // Stop when reclaimed (queued), cancelled, suspended, or otherwise not owned.
    return status !== 'running';
  }

  async isCancelled(id: string): Promise<boolean> {
    return this.shouldStop(id);
  }

  async insertItems(
    jobId: string,
    rows: Array<{
      itemId: string | null;
      linkUrl: string | null;
      payload: Record<string, unknown>;
      status?: BackgroundJobItemStatus;
    }>
  ): Promise<BackgroundJobItem[]> {
    if (rows.length === 0) return [];
    const insertRows = rows.map((row) => ({
      job_id: jobId,
      item_id: row.itemId,
      link_url: row.linkUrl,
      status: row.status ?? 'pending',
      payload: sql.json(row.payload as any),
    }));
    const createdRows = await sql`
      INSERT INTO background_job_items ${sql(insertRows)}
      RETURNING *
    `;
    return createdRows.map((created) => mapItem(created as Record<string, unknown>));
  }

  async listItems(jobId: string): Promise<BackgroundJobItem[]> {
    const rows = await sql`
      SELECT * FROM background_job_items
      WHERE job_id = ${jobId}
      ORDER BY created_at ASC
    `;
    return rows.map((row) => mapItem(row as Record<string, unknown>));
  }

  async updateItemStatus(
    id: string,
    status: BackgroundJobItemStatus,
    error?: string | null
  ): Promise<void> {
    await sql`
      UPDATE background_job_items
      SET
        status = ${status},
        error = ${error ?? null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
  }
}
