import type { ContentReport } from './content-report.interface';

export interface ReportListResult {
  reports: ContentReport[];
  page: number;
  total: number;
}
