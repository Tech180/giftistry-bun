import { AppError } from '@/common/domain/errors/app-error';
import type { ReportRepository } from '../../../domain/ports/report.repository';
import { isReportTargetType } from '../../../domain/utils/is-report-target-type.util';
import type { CreateReportPayload } from '../interfaces/create-report-payload.interface';

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
