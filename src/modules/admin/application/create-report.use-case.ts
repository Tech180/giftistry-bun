import { AppError } from '@/common/middlewares/error.middleware';
import type {
  ReportRepository,
  ReportTargetType,
} from '../domain/ports/report.repository';

const VALID_TARGET_TYPES = new Set<ReportTargetType>(['comment', 'wishlist', 'user']);

export interface CreateReportPayload {
  targetType: string;
  targetId: string;
  reason?: string;
}

function isReportTargetType(value: string): value is ReportTargetType {
  return VALID_TARGET_TYPES.has(value as ReportTargetType);
}

export class CreateReportUseCase {
  constructor(private reportRepo: ReportRepository) {}

  async execute(reporterId: string, payload: CreateReportPayload): Promise<void> {
    if (!isReportTargetType(payload.targetType)) {
      throw new AppError('Invalid report target type', 400, 'INVALID_TARGET_TYPE');
    }

    if (!payload.targetId?.trim()) {
      throw new AppError('Target id is required', 400, 'INVALID_TARGET_ID');
    }

    await this.reportRepo.create({
      reporterId,
      targetType: payload.targetType,
      targetId: payload.targetId.trim(),
      reason: payload.reason?.trim() ?? '',
    });
  }
}
