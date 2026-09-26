import type { ReportTargetType } from '../types/report-target-type.type';

export interface CreateReportInput {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}
