import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';
import type { ItemSummarizeJobPayload } from '../domain/background-job.entity';
import { toJobPublicView } from '../domain/background-job.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { checkRateLimit } from '@/common/middlewares/rate-limit.middleware';

export class StartItemSummarizeJobUseCase {
  constructor(private jobRepo: BackgroundJobRepository) {}

  async execute(
    userId: string,
    payload: ItemSummarizeJobPayload,
    rateLimitKey: string
  ): Promise<Record<string, unknown>> {
    checkRateLimit(rateLimitKey, { windowMs: 60000, max: 18 });

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

    return toJobPublicView(started);
  }
}
