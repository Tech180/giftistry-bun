import type { BackgroundJobRepository } from '../../../domain/ports/background-job.repository';
import type { ItemJobSupportPort } from '@/modules/item';
import type { BackgroundJob } from '../../../domain/interfaces/background-job.interface';
import type { ItemSummarizeJobPayload } from '../../../domain/interfaces/item-summarize-job-payload.type';
import type { JobProgressPublisher } from '../../../domain/ports/job-progress-publisher.port';
import type { NotifyItemJobCompletionUseCase } from '../../../application/use-cases/notify-item-job-completion.use-case';
import {
  failBackgroundJob,
  notifyItemJobTerminal,
  publishJobProgress,
} from '../../../application/utils/publish-job-update.util';
import { withJobHeartbeat } from '../../../application/utils/with-job-heartbeat.util';

export class RunItemSummarizeJobUseCase {
  constructor(
    private jobRepo: BackgroundJobRepository,
    private itemUseCases: ItemJobSupportPort,
    private jobProgressPublisher: JobProgressPublisher,
    private notifyItemJobCompletion?: NotifyItemJobCompletionUseCase
  ) {}

  async execute(job: BackgroundJob): Promise<void> {
    try {
      if (await this.jobRepo.shouldStop(job.Id)) {
        return;
      }

      const payload = job.Payload as ItemSummarizeJobPayload;

      await publishJobProgress(this.jobRepo, this.jobProgressPublisher, job.Id, {
        phase: 'grabbing_info',
        message: 'Summarizing…',
        progressDone: 0,
        progressTotal: Math.max(1, job.ProgressTotal || 1),
      });

      const description = await withJobHeartbeat(
        this.jobRepo,
        job.Id,
        this.itemUseCases.summarizeItemDescription.execute(job.UserId, {
          listId: payload.listId,
          name: payload.name,
          text: payload.text ?? undefined,
          linkUrl: payload.linkUrl ?? undefined,
          websiteName: payload.websiteName ?? undefined,
          price: payload.price ?? null,
          category: payload.category ?? undefined,
          priority: payload.priority ?? null,
          customFields: payload.customFields,
          variations: payload.variations,
          desiredQuantity: payload.desiredQuantity ?? undefined,
        })
      );

      if (payload.writeBack && payload.itemId) {
        await this.writeBackDescription(job.UserId, payload, description);
      }

      const updated = await this.jobRepo.updateProgress(job.Id, {
        status: 'completed',
        phase: 'completed',
        message: 'Summary ready',
        progressDone: 1,
        progressTotal: 1,
        finishedAt: new Date(),
        result: { Description: description },
      });
      if (updated) {
        this.jobProgressPublisher.publish(updated, 'job.completed');
        void notifyItemJobTerminal(this.notifyItemJobCompletion, updated);
      }
    } catch (err) {
      await failBackgroundJob(
        this.jobRepo,
        this.jobProgressPublisher,
        job.Id,
        err instanceof Error ? err.message : 'Summarization failed',
        this.notifyItemJobCompletion
      );
    }
  }

  private async writeBackDescription(
    userId: string,
    payload: ItemSummarizeJobPayload,
    description: string
  ): Promise<void> {
    const itemId = payload.itemId as string;

    let priorityId: string | null = null;
    let name = payload.name;
    let category = payload.category ?? 'uncategorized';
    let priority = payload.priority ?? null;
    try {
      const { Items } = await this.itemUseCases.listItems.execute(payload.listId, userId);
      const found = Items.find((entry) => entry.Id === itemId);
      if (found) {
        priorityId = (found.PriorityId as string | null) ?? null;
        name = String(found.Name ?? name);
        category = String(found.Category ?? category);
        priority = (found.Priority as number | null) ?? priority;
      }
    } catch {
      // fall back to payload-provided values if the item can't be loaded
    }

    await this.itemUseCases.updateItem.execute(
      itemId,
      userId,
      name,
      description,
      priorityId,
      category,
      priority
    );
  }
}
