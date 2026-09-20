export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export type ReportTargetType = 'comment' | 'wishlist' | 'user';

export interface ContentReport {
  Id: string;
  TargetType: string;
  TargetId: string;
  Reason: string;
  Status: ReportStatus;
  CreatedAt: Date | string;
  ReporterUsername: string | null;
}

export interface CreateReportInput {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

export interface ReportListResult {
  reports: ContentReport[];
  page: number;
  total: number;
}

export interface ReportRepository {
  create(input: CreateReportInput): Promise<void>;
  list(status: string, page: number, limit: number): Promise<ReportListResult>;
  getOpenCount(): Promise<number>;
  updateStatus(id: string, status: ReportStatus, resolvedBy: string): Promise<void>;
}
