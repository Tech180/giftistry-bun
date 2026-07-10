import { sql } from '@/common/database/connection';
import type {
  AuditLogRepository,
  AuditLogEntry,
  AuditLogOverviewEntry,
  AuditLogListResult,
} from '@/common/domain/ports/audit-log.repository';

export class PostgresAuditLogRepository implements AuditLogRepository {
  async write(entry: AuditLogEntry): Promise<void> {
    try {
      await sql`
        INSERT INTO audit_log (actor_id, target_id, action, metadata, ip_address)
        VALUES (
          ${entry.actorId ?? null},
          ${entry.targetId ?? null},
          ${entry.action},
          ${JSON.stringify(entry.metadata ?? {})}::jsonb,
          ${entry.ip ?? null}
        )
      `;
    } catch (err) {
      console.error('[WARN] Failed to write audit log:', err);
    }
  }

  async listRecent(limit: number): Promise<AuditLogOverviewEntry[]> {
    return sql<AuditLogOverviewEntry[]>`
      SELECT a.id as "Id", a.action as "Action", a.created_at as "CreatedAt",
             actor.username as "ActorUsername", target.username as "TargetUsername"
      FROM audit_log a
      LEFT JOIN users actor ON actor.id = a.actor_id
      LEFT JOIN users target ON target.id = a.target_id
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;
  }

  async list(page: number, limit: number, actionFilter: string): Promise<AuditLogListResult> {
    const offset = (page - 1) * limit;
    const action = actionFilter.trim();

    const rows = await sql`
      SELECT a.id as "Id", a.action as "Action", a.created_at as "CreatedAt",
             a.metadata as "Metadata", a.ip_address as "Ip",
             actor.username as "ActorUsername", target.username as "TargetUsername"
      FROM audit_log a
      LEFT JOIN users actor ON actor.id = a.actor_id
      LEFT JOIN users target ON target.id = a.target_id
      WHERE (${action === ''} OR a.action ILIKE ${'%' + action + '%'})
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::integer as count FROM audit_log a
      WHERE (${action === ''} OR a.action ILIKE ${'%' + action + '%'})
    `;

    return {
      entries: rows as AuditLogListResult['entries'],
      page,
      total: countRow?.count ?? 0,
    };
  }
}
