import type { BackgroundJobRepository } from '../../../domain/ports/background-job.repository';
import type { ItemSummarizeJobPayload } from '../../../domain/interfaces/item-summarize-job-payload.type';
import { mapToJobPublicView } from '../../../application/utils/map-to-job-public-view.util';
import { AppError } from '@/common/domain/errors/app-error';
import { checkRateLimit } from '@/common/middlewares/utils/check-rate-limit.util';
import type { ServerConfigRepository } from '@/modules/system';
import { ITEM_SUMMARIZE_RATE_LIMIT } from '../constants/rate-limit.constant';

export class StartItemSummarizeJobUseCase {
  constructor(
    private jobRepo: BackgroundJobRepository,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(
    userId: string,
    payload: ItemSummarizeJobPayload,
    rateLimitKey: string
  ): Promise<Record<string, unknown>> {
    checkRateLimit(rateLimitKey, ITEM_SUMMARIZE_RATE_LIMIT);

    if (!payload.listId) {
      throw new AppError('List ID is required', 400, 'BAD_REQUEST');
    }
    if (!payload.name?.trim()) {
      throw new AppError('Item name is required', 400, 'BAD_REQUEST');
    }

    const job = await this.jobRepo.create({
      kind: 'item-summarize',
      userId,
      listId: payload.listId,
      payload,
    });
    const started = (await this.jobRepo.updateProgress(job.Id, { progressTotal: 1 })) ?? job;

    return mapToJobPublicView(started, null, this.serverConfigRepo);
  }
}
