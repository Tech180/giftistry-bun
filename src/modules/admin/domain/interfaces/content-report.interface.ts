import type { ReportStatus } from '../types/report-status.type';

export interface ContentReport {
  Id: string;
  TargetType: string;
  TargetId: string;
  Reason: string;
  Status: ReportStatus;
  CreatedAt: Date | string;
  ReporterUsername: string | null;
}
