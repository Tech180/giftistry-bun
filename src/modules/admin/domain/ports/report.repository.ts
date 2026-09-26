import type { CreateReportInput } from '../interfaces/create-report-input.interface';
import type { ReportListResult } from '../interfaces/report-list-result.interface';
import type { ReportStatus } from '../types/report-status.type';

export interface ReportRepository {
  create(input: CreateReportInput): Promise<void>;
  list(status: string, page: number, limit: number): Promise<ReportListResult>;
  getOpenCount(): Promise<number>;
  updateStatus(id: string, status: ReportStatus, resolvedBy: string): Promise<void>;
}
