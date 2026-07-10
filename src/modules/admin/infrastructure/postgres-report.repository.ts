import { sql } from '@/common/database/connection';
import type {
  ContentReport,
  ReportListResult,
  ReportRepository,
  ReportStatus,
} from '../domain/ports/report.repository';

export class PostgresReportRepository implements ReportRepository {
  async list(status: string, page: number, limit: number): Promise<ReportListResult> {
    const offset = (page - 1) * limit;

    const rows = await sql<ContentReport[]>`
      SELECT r.id as "Id", r.target_type as "TargetType", r.target_id as "TargetId",
             r.reason as "Reason", r.status as "Status", r.created_at as "CreatedAt",
             reporter.username as "ReporterUsername"
      FROM content_reports r
      LEFT JOIN users reporter ON reporter.id = r.reporter_id
      WHERE (${status === 'all'} OR r.status = ${status})
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::integer as count FROM content_reports
      WHERE (${status === 'all'} OR status = ${status})
    `;

    return {
      reports: [...rows],
      page,
      total: countRow?.count ?? 0,
    };
  }

  async getOpenCount(): Promise<number> {
    const [reports] = await sql<{ open: number }[]>`
      SELECT COUNT(*)::integer as open FROM content_reports WHERE status = 'open'
    `;
    return reports?.open ?? 0;
  }

  async updateStatus(id: string, status: ReportStatus, resolvedBy: string): Promise<void> {
    await sql`
      UPDATE content_reports SET
        status = ${status},
        resolved_by = ${resolvedBy},
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
  }
}
