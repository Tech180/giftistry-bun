import type { BackgroundJobRepository } from '../../../domain/ports/background-job.repository';
import type { ItemJobSupportPort } from '@/modules/item';
import type { BackgroundJob } from '../../../domain/interfaces/background-job.interface';
import type { BackgroundJobItem } from '../../../domain/interfaces/background-job-item.interface';
import type { ItemEnrichJobPayload } from '../../../domain/interfaces/item-enrich-job-payload.type';
import type { JobProgressPublisher } from '../../../domain/ports/job-progress-publisher.port';
import type { NotifyItemJobCompletionUseCase } from '../../../application/use-cases/notify-item-job-completion.use-case';
import { createThrottledAsync } from '../../../application/utils/create-throttled-async.util';
import { mergeGrabInfoMetadata } from '../../../application/utils/merge-grab-info-description.util';
import { mergePreferExtracted } from '../../../application/utils/merge-prefer-extracted.util';
import {
  failBackgroundJob,
  notifyItemJobTerminal,
  publishJobProgress,
} from '../../../application/utils/publish-job-update.util';
import { withJobHeartbeat } from '../../../application/utils/with-job-heartbeat.util';
import { resolveDesiredQuantity } from '@/modules/item';
import {
  clearGrabPhasePayloadPatch,
  grabPhasePayloadPatch,
} from '../../../domain/utils/grab-item-phase.util';
import type { ExistingItemState } from '../interfaces/existing-item-state.interface';
import { buildEnrichJobResult } from '../utils/build-enrich-job-result.util';
import { mapListItemToExistingState } from '../utils/map-list-item-to-existing-state.util';

export class RunItemEnrichJobUseCase {
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

      const payload = job.Payload as ItemEnrichJobPayload;

      await this.patch(job.Id, {
        phase: 'grabbing_info',
        message: 'Grabbing info…',
        progressDone: 0,
        progressTotal: Math.max(1, job.ProgressTotal || 1),
      });

      if (payload.intent === 'draft-populate') {
        await this.runDraftPopulate(job, payload);
        return;
      }

      await this.runWriteBack(job, payload);
    } catch (err) {
      await this.fail(job.Id, err instanceof Error ? err.message : 'Enrichment failed');
    }
  }

  private async runDraftPopulate(
    job: BackgroundJob,
    payload: Extract<ItemEnrichJobPayload, { intent: 'draft-populate' }>
  ): Promise<void> {
    if (await this.jobRepo.shouldStop(job.Id)) {
      return;
    }

    try {
      const extract = await withJobHeartbeat(
        this.jobRepo,
        job.Id,
        this.itemUseCases.extractMetadata.execute(payload.url, job.UserId, {
          listId: payload.listId,
        })
      );

      const updated = await this.jobRepo.updateProgress(job.Id, {
        status: 'completed',
        phase: 'completed',
        message: 'Info extracted',
        progressDone: 1,
        progressTotal: 1,
        finishedAt: new Date(),
        result: buildEnrichJobResult(extract, payload.url),
      });
      if (updated) {
        this.jobProgressPublisher.publish(updated, 'job.completed');
        void notifyItemJobTerminal(this.notifyItemJobCompletion, updated);
      }
    } catch (err) {
      await this.fail(job.Id, err instanceof Error ? err.message : 'Extraction failed');
    }
  }

  private async runWriteBack(
    job: BackgroundJob,
    payload: Extract<ItemEnrichJobPayload, { intent: 'create-from-url' | 'update-item' }>
  ): Promise<void> {
    if (await this.jobRepo.shouldStop(job.Id)) {
      return;
    }

    const jobItems = await this.jobRepo.listItems(job.Id);
    const jobItem = jobItems[0];
    const itemId = payload.intent === 'update-item' ? payload.itemId : jobItem?.ItemId;

    if (!itemId) {
      await this.fail(job.Id, 'No item associated with this job.');
      return;
    }

    if (jobItem) {
      await this.jobRepo.updateItemStatus(jobItem.Id, 'running');
      await this.patch(job.Id, { message: 'Grabbing info…' }, jobItems);
    }

    const current = await this.loadExistingState(payload.listId, job.UserId, itemId);
    const throttle = createThrottledAsync(() =>
      this.patch(job.Id, { message: 'Grabbing info…' }, jobItems)
    );

    try {
      const extract = await withJobHeartbeat(
        this.jobRepo,
        job.Id,
        this.itemUseCases.extractMetadata.execute(payload.url, job.UserId, {
          listId: payload.listId,
          onProgress: async (update) => {
            if (!jobItem) {
              return;
            }
            const patch = grabPhasePayloadPatch(update.phase, update.tokensPerSecond);
            jobItem.Payload = { ...jobItem.Payload, ...patch };
            await this.jobRepo.updateItemPayload(jobItem.Id, patch);
            throttle.schedule();
          },
        })
      );

      const name = mergePreferExtracted(extract.data.title, current.name, current.name);
      const packQty = resolveDesiredQuantity(
        extract.data.desiredQuantity,
        name,
        current.name,
        extract.data.title
      );
      const { text, metadata } = mergeGrabInfoMetadata(
        current.description,
        extract.data.description,
        extract.data.predefinedFields,
        extract.data.userDefinedFields,
        { desiredQuantity: packQty, existingMetadata: current.metadata }
      );
      const category = mergePreferExtracted(extract.data.category, current.category, current.category);
      const price = extract.data.price != null ? extract.data.price : null;
      const websiteName = mergePreferExtracted(extract.websiteName, null, '') || null;
      const description = text ?? '';
      const resolvedLinkUrl = extract.finalUrl?.trim() || payload.url;

      await this.itemUseCases.updateItem.execute(
        itemId,
        job.UserId,
        name,
        description,
        null,
        category,
        current.priority,
        undefined,
        resolvedLinkUrl,
        price,
        websiteName,
        metadata ?? undefined,
        undefined,
        null
      );

      await this.itemUseCases.promoteScrapedImageToPhotos.execute(
        itemId,
        extract.data.imageUrl
      );

      if (jobItem) {
        await this.jobRepo.updateItemStatus(jobItem.Id, 'done');
        const clearPatch = clearGrabPhasePayloadPatch();
        jobItem.Payload = { ...jobItem.Payload, ...clearPatch };
        await this.jobRepo.updateItemPayload(jobItem.Id, clearPatch);
      }
      throttle.cancel();

      const finalItems = await this.jobRepo.listItems(job.Id);
      const updated = await this.jobRepo.updateProgress(job.Id, {
        status: 'completed',
        phase: 'completed',
        message: 'Info grabbed',
        progressDone: 1,
        progressTotal: 1,
        finishedAt: new Date(),
        result: {
          ItemId: itemId,
          ...buildEnrichJobResult(extract, payload.url),
        },
      });
      if (updated) {
        this.jobProgressPublisher.publish(updated, 'job.completed', finalItems);
        void notifyItemJobTerminal(this.notifyItemJobCompletion, updated);
      }
    } catch (err) {
      if (jobItem) {
        await this.jobRepo.updateItemStatus(
          jobItem.Id,
          'failed',
          err instanceof Error ? err.message : 'Grab failed'
        );
        const clearPatch = clearGrabPhasePayloadPatch();
        jobItem.Payload = { ...jobItem.Payload, ...clearPatch };
        await this.jobRepo.updateItemPayload(jobItem.Id, clearPatch);
      }
      throttle.cancel();
      await this.fail(job.Id, err instanceof Error ? err.message : 'Enrichment failed');
    }
  }

  private async loadExistingState(
    listId: string,
    userId: string,
    itemId: string
  ): Promise<ExistingItemState> {
    try {
      const { Items } = await this.itemUseCases.listItems.execute(listId, userId);
      return mapListItemToExistingState(Items.find((entry) => entry.Id === itemId));
    } catch {
      return mapListItemToExistingState(undefined);
    }
  }

  private async patch(
    id: string,
    patch: Parameters<BackgroundJobRepository['updateProgress']>[1],
    items?: BackgroundJobItem[] | null
  ): Promise<void> {
    await publishJobProgress(this.jobRepo, this.jobProgressPublisher, id, patch, items);
  }

  private async fail(id: string, message: string): Promise<void> {
    await failBackgroundJob(
      this.jobRepo,
      this.jobProgressPublisher,
      id,
      message,
      this.notifyItemJobCompletion
    );
  }
}
