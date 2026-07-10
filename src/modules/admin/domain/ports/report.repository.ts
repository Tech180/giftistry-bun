export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface ContentReport {
  Id: string;
  TargetType: string;
  TargetId: string;
  Reason: string;
  Status: ReportStatus;
  CreatedAt: Date | string;
  ReporterUsername: string | null;
}

export interface ReportListResult {
  reports: ContentReport[];
  page: number;
  total: number;
}

export interface ReportRepository {
  list(status: string, page: number, limit: number): Promise<ReportListResult>;
  getOpenCount(): Promise<number>;
  updateStatus(id: string, status: ReportStatus, resolvedBy: string): Promise<void>;
}
