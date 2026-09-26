import { sql } from '@/common/database';
import type { CreateBackgroundJobInput } from '../../domain/interfaces/create-background-job-input.interface';
import type { InsertBackgroundJobItemInput } from '../../domain/interfaces/insert-background-job-item-input.interface';
import type { UpdateBackgroundJobProgressPatch } from '../../domain/interfaces/update-background-job-progress-patch.interface';
import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { BackgroundJobItem } from '../../domain/interfaces/background-job-item.interface';
import type { BackgroundJobItemStatus } from '../../domain/interfaces/background-job-item-status.type';
import type { BackgroundJobRepository } from '../../domain/ports/background-job.repository';
import { mergeResultProgressRate } from '../../domain/utils/job-progress-rate.util';
import { ACTIVE_BACKGROUND_JOB_STATUSES } from '../constants/active-background-job-statuses.constant';
import { LIST_ACTIVE_JOBS_LIMIT } from '../constants/list-active-jobs-limit.constant';
import type { BackgroundJobItemRow } from '../interfaces/background-job-item-row.interface';
import type { BackgroundJobRow } from '../interfaces/background-job-row.interface';
import { mapBackgroundJobItemRow } from '../utils/map-background-job-item-row.util';
import { mapBackgroundJobRow } from '../utils/map-background-job-row.util';

export class PostgresBackgroundJobRepository implements BackgroundJobRepository {
  async create(input: CreateBackgroundJobInput): Promise<BackgroundJob> {
    const [row] = await sql<BackgroundJobRow[]>`
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
    if (!row) {
      throw new Error('Failed to create background job');
    }
    return mapBackgroundJobRow(row);
  }

  async findById(id: string): Promise<BackgroundJob | null> {
    const [row] = await sql<BackgroundJobRow[]>`
      SELECT * FROM background_jobs WHERE id = ${id}
    `;
    return row ? mapBackgroundJobRow(row) : null;
  }

  async findActiveByListId(listId: string): Promise<BackgroundJob | null> {
    const [row] = await sql<BackgroundJobRow[]>`
      SELECT * FROM background_jobs
      WHERE list_id = ${listId}
        AND status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return row ? mapBackgroundJobRow(row) : null;
  }

  async claimNextQueued(): Promise<BackgroundJob | null> {
    const rows = await sql<BackgroundJobRow[]>`
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
    return row ? mapBackgroundJobRow(row) : null;
  }

  async updateProgress(
    id: string,
    patch: UpdateBackgroundJobProgressPatch
  ): Promise<BackgroundJob | null> {
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    let nextResult = patch.result !== undefined ? patch.result : current.Result;
    if (patch.progressRate !== undefined) {
      nextResult = mergeResultProgressRate(nextResult, patch.progressRate);
    }

    const [row] = await sql<BackgroundJobRow[]>`
      UPDATE background_jobs
      SET
        list_id = ${patch.listId !== undefined ? patch.listId : current.ListId},
        status = ${patch.status ?? current.Status},
        phase = ${patch.phase ?? current.Phase},
        progress_done = ${patch.progressDone ?? current.ProgressDone},
        progress_total = ${patch.progressTotal ?? current.ProgressTotal},
        message = ${patch.message ?? current.Message},
        error = ${patch.error !== undefined ? patch.error : current.Error},
        result = ${sql.json(nextResult as never)},
        started_at = ${
          patch.startedAt !== undefined ? patch.startedAt : current.StartedAt
        },
        finished_at = ${
          patch.finishedAt !== undefined ? patch.finishedAt : current.FinishedAt
        },
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? mapBackgroundJobRow(row) : null;
  }

  async requestCancel(id: string, userId: string): Promise<BackgroundJob | null> {
    const [row] = await sql<BackgroundJobRow[]>`
      UPDATE background_jobs
      SET
        status = CASE
          WHEN status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)} THEN 'cancelled'
          ELSE status
        END,
        phase = CASE
          WHEN status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)} THEN 'cancelled'
          ELSE phase
        END,
        message = CASE
          WHEN status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)} THEN 'Cancelled'
          ELSE message
        END,
        finished_at = CASE
          WHEN status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)} THEN CURRENT_TIMESTAMP
          ELSE finished_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    return row ? mapBackgroundJobRow(row) : null;
  }

  async requestCancelAny(id: string): Promise<BackgroundJob | null> {
    const [row] = await sql<BackgroundJobRow[]>`
      UPDATE background_jobs
      SET
        status = CASE
          WHEN status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)} THEN 'cancelled'
          ELSE status
        END,
        phase = CASE
          WHEN status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)} THEN 'cancelled'
          ELSE phase
        END,
        message = CASE
          WHEN status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)} THEN 'Cancelled'
          ELSE message
        END,
        finished_at = CASE
          WHEN status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)} THEN CURRENT_TIMESTAMP
          ELSE finished_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)}
      RETURNING *
    `;
    return row ? mapBackgroundJobRow(row) : null;
  }

  async requestSuspend(id: string, userId: string): Promise<BackgroundJob | null> {
    const [row] = await sql<BackgroundJobRow[]>`
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
    return row ? mapBackgroundJobRow(row) : null;
  }

  async requestSuspendAny(id: string): Promise<BackgroundJob | null> {
    const [row] = await sql<BackgroundJobRow[]>`
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
    return row ? mapBackgroundJobRow(row) : null;
  }

  async requestResume(id: string, userId: string): Promise<BackgroundJob | null> {
    const [row] = await sql<BackgroundJobRow[]>`
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
    return row ? mapBackgroundJobRow(row) : null;
  }

  async requestResumeAny(id: string): Promise<BackgroundJob | null> {
    const [row] = await sql<BackgroundJobRow[]>`
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
    return row ? mapBackgroundJobRow(row) : null;
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
        AND status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)}
      RETURNING id
    `;
    return rows.length;
  }

  async listActiveByUserId(userId: string): Promise<BackgroundJob[]> {
    const rows = await sql<BackgroundJobRow[]>`
      SELECT * FROM background_jobs
      WHERE user_id = ${userId}
        AND status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)}
      ORDER BY created_at DESC
    `;
    return rows.map(mapBackgroundJobRow);
  }

  async listActiveAll(): Promise<BackgroundJob[]> {
    const rows = await sql<BackgroundJobRow[]>`
      SELECT * FROM background_jobs
      WHERE status IN ${sql(ACTIVE_BACKGROUND_JOB_STATUSES)}
      ORDER BY created_at DESC
      LIMIT ${LIST_ACTIVE_JOBS_LIMIT}
    `;
    return rows.map(mapBackgroundJobRow);
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
    rows: InsertBackgroundJobItemInput[]
  ): Promise<BackgroundJobItem[]> {
    if (rows.length === 0) {
      return [];
    }

    const insertRows = rows.map((row) => ({
      job_id: jobId,
      item_id: row.itemId,
      link_url: row.linkUrl,
      status: row.status ?? 'pending',
      payload: sql.json(row.payload as never),
    }));
    const createdRows = await sql<BackgroundJobItemRow[]>`
      INSERT INTO background_job_items ${sql(insertRows)}
      RETURNING *
    `;
    return createdRows.map(mapBackgroundJobItemRow);
  }

  async listItems(jobId: string): Promise<BackgroundJobItem[]> {
    const rows = await sql<BackgroundJobItemRow[]>`
      SELECT * FROM background_job_items
      WHERE job_id = ${jobId}
      ORDER BY created_at ASC
    `;
    return rows.map(mapBackgroundJobItemRow);
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

  async updateItemPayload(id: string, patch: Record<string, unknown>): Promise<void> {
    await sql`
      UPDATE background_job_items
      SET
        payload = COALESCE(payload, '{}'::jsonb) || ${sql.json(patch as never)},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
  }
}
