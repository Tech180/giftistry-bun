import { REPORT_TARGET_TYPES } from '../constants/report-target-types.constant';
import type { ReportTargetType } from '../types/report-target-type.type';

const VALID_TARGET_TYPES = new Set<string>(REPORT_TARGET_TYPES);

export function isReportTargetType(value: string): value is ReportTargetType {
  return VALID_TARGET_TYPES.has(value);
}
