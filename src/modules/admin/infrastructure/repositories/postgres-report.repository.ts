import { sql } from '@/common/database';
import type { ReportRepository } from '../../domain/ports/report.repository';
import type { ContentReport } from '../../domain/interfaces/content-report.interface';
import type { CreateReportInput } from '../../domain/interfaces/create-report-input.interface';
import type { ReportListResult } from '../../domain/interfaces/report-list-result.interface';
import type { ReportStatus } from '../../domain/types/report-status.type';
import { REPORT_LIST_SELECT } from '../constants/report-list-select.constant';

export class PostgresReportRepository implements ReportRepository {
  async create(input: CreateReportInput): Promise<void> {
    await sql`
      INSERT INTO content_reports (reporter_id, target_type, target_id, reason)
      VALUES (${input.reporterId}, ${input.targetType}, ${input.targetId}, ${input.reason})
    `;
  }

  async list(status: string, page: number, limit: number): Promise<ReportListResult> {
    const offset = (page - 1) * limit;

    const rows = await sql<ContentReport[]>`
      SELECT ${sql.unsafe(REPORT_LIST_SELECT)}
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
