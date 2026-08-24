import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';
import type { ItemUseCases } from '@/modules/item/application/item-use-cases.interface';
import type {
  BackgroundJob,
  BackgroundJobItem,
  ItemEnrichJobPayload,
} from '../domain/background-job.entity';
import type { JobProgressPublisher } from '../domain/ports/job-progress-publisher.port';
import type { NotifyItemJobCompletionUseCase } from './notify-item-job-completion.use-case';
import { withJobHeartbeat } from './with-job-heartbeat.util';
import { mergeGrabInfoMetadata } from './merge-grab-info-description.util';
import { resolveDesiredQuantity } from '@/modules/item/domain/parse-pack-quantity.util';
import type { ItemDescriptionMetadata } from '@/modules/item/domain/item-description.util';
import {
  clearGrabPhasePayloadPatch,
  grabPhasePayloadPatch,
} from '../domain/grab-item-phase.util';

function mergeString(
  extracted: string | null | undefined,
  existing: string | null | undefined,
  fallback = ''
): string {
  const next = extracted?.trim();
  if (next) return next;
  const keep = existing?.trim();
  if (keep) return keep;
  return fallback;
}

interface ExistingItemState {
  name: string;
  description: string | null;
  category: string;
  priority: number | null;
  metadata: ItemDescriptionMetadata | null;
}

export class RunItemEnrichJobUseCase {
  constructor(
    private jobRepo: BackgroundJobRepository,
    private itemUseCases: ItemUseCases,
    private jobProgressPublisher: JobProgressPublisher,
    private notifyItemJobCompletion?: NotifyItemJobCompletionUseCase
  ) {}

  async execute(job: BackgroundJob): Promise<void> {
    try {
      if (await this.jobRepo.shouldStop(job.Id)) return;

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
    if (await this.jobRepo.shouldStop(job.Id)) return;

    try {
      const extract = await withJobHeartbeat(
        this.jobRepo,
        job.Id,
        this.itemUseCases.extractMetadata.execute(payload.url, job.UserId, {
          listId: payload.listId,
        })
      );

      const result = {
        Title: extract.data.title,
        Price: extract.data.price,
        Description: extract.data.description,
        Category: extract.data.category,
        CategoryAlternatives: extract.data.categoryAlternatives ?? [],
        ImageUrl: extract.data.imageUrl,
        WebsiteName: extract.websiteName ?? null,
        CustomFields: {
          Predefined: extract.data.predefinedFields ?? {},
          UserDefined: extract.data.userDefinedFields ?? {},
        },
        Diagnostics: {
          Source: extract.diagnostics.source,
          Confidence: extract.diagnostics.confidence,
          FieldsFound: extract.diagnostics.fieldsFound,
          AiPopulate: extract.diagnostics.aiPopulate,
        },
      };

      const updated = await this.jobRepo.updateProgress(job.Id, {
        status: 'completed',
        phase: 'completed',
        message: 'Info extracted',
        progressDone: 1,
        progressTotal: 1,
        finishedAt: new Date(),
        result,
      });
      if (updated) {
        this.jobProgressPublisher.publish(updated, 'job.completed');
        void this.notifyTerminal(updated);
      }
    } catch (err) {
      await this.fail(job.Id, err instanceof Error ? err.message : 'Extraction failed');
    }
  }

  private async runWriteBack(
    job: BackgroundJob,
    payload: Extract<ItemEnrichJobPayload, { intent: 'create-from-url' | 'update-item' }>
  ): Promise<void> {
    if (await this.jobRepo.shouldStop(job.Id)) return;

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

    let lastStreamPublishAt = 0;
    let streamPublishTimer: ReturnType<typeof setTimeout> | null = null;

    const publishEnrichProgress = async () => {
      lastStreamPublishAt = Date.now();
      await this.patch(job.Id, { message: 'Grabbing info…' }, jobItems);
    };

    const scheduleStreamPublish = () => {
      const elapsed = Date.now() - lastStreamPublishAt;
      if (elapsed >= 250) {
        void publishEnrichProgress();
        return;
      }
      if (streamPublishTimer) return;
      streamPublishTimer = setTimeout(() => {
        streamPublishTimer = null;
        void publishEnrichProgress();
      }, 250 - elapsed);
    };

    try {
      const extract = await withJobHeartbeat(
        this.jobRepo,
        job.Id,
        this.itemUseCases.extractMetadata.execute(payload.url, job.UserId, {
          listId: payload.listId,
          onProgress: async (update) => {
            if (!jobItem) return;
            const patch = grabPhasePayloadPatch(update.phase, update.tokensPerSecond);
            jobItem.Payload = { ...jobItem.Payload, ...patch };
            await this.jobRepo.updateItemPayload(jobItem.Id, patch);
            scheduleStreamPublish();
          },
        })
      );

      const name = mergeString(extract.data.title, current.name, current.name);
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
      const category = mergeString(extract.data.category, current.category, current.category);
      const price = extract.data.price != null ? extract.data.price : null;
      const websiteName = mergeString(extract.websiteName, null, '') || null;
      const description = text ?? '';

      await this.itemUseCases.updateItem.execute(
        itemId,
        job.UserId,
        name,
        description,
        null,
        category,
        current.priority,
        undefined,
        payload.url,
        price,
        websiteName,
        metadata ?? undefined
      );

      if (jobItem) {
        await this.jobRepo.updateItemStatus(jobItem.Id, 'done');
        const clearPatch = clearGrabPhasePayloadPatch();
        jobItem.Payload = { ...jobItem.Payload, ...clearPatch };
        await this.jobRepo.updateItemPayload(jobItem.Id, clearPatch);
      }
      if (streamPublishTimer) {
        clearTimeout(streamPublishTimer);
        streamPublishTimer = null;
      }

      const finalItems = await this.jobRepo.listItems(job.Id);
      const result = {
        ItemId: itemId,
        Title: extract.data.title,
        Price: extract.data.price,
        Description: extract.data.description,
        Category: extract.data.category,
        CategoryAlternatives: extract.data.categoryAlternatives ?? [],
        ImageUrl: extract.data.imageUrl,
        WebsiteName: extract.websiteName ?? null,
        CustomFields: {
          Predefined: extract.data.predefinedFields ?? {},
          UserDefined: extract.data.userDefinedFields ?? {},
        },
        Diagnostics: {
          Source: extract.diagnostics.source,
          Confidence: extract.diagnostics.confidence,
          FieldsFound: extract.diagnostics.fieldsFound,
          AiPopulate: extract.diagnostics.aiPopulate,
        },
      };
      const updated = await this.jobRepo.updateProgress(job.Id, {
        status: 'completed',
        phase: 'completed',
        message: 'Info grabbed',
        progressDone: 1,
        progressTotal: 1,
        finishedAt: new Date(),
        result,
      });
      if (updated) {
        this.jobProgressPublisher.publish(updated, 'job.completed', finalItems);
        void this.notifyTerminal(updated);
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
      if (streamPublishTimer) {
        clearTimeout(streamPublishTimer);
        streamPublishTimer = null;
      }
      await this.fail(job.Id, err instanceof Error ? err.message : 'Enrichment failed');
    }
  }

  private async loadExistingState(
    listId: string,
    userId: string,
    itemId: string
  ): Promise<ExistingItemState> {
    const fallback: ExistingItemState = {
      name: 'Item',
      description: null,
      category: 'uncategorized',
      priority: null,
      metadata: null,
    };
    try {
      const { Items } = await this.itemUseCases.listItems.execute(listId, userId);
      const found = Items.find((entry) => entry.Id === itemId);
      if (!found) return fallback;
      const metadata =
        found.Metadata && typeof found.Metadata === 'object'
          ? (found.Metadata as ItemDescriptionMetadata)
          : null;
      return {
        name: String(found.Name ?? fallback.name),
        description: (found.Description as string | null) ?? null,
        category: String(found.Category ?? fallback.category),
        priority: (found.Priority as number | null) ?? null,
        metadata,
      };
    } catch {
      return fallback;
    }
  }

  private async patch(
    id: string,
    patch: Parameters<BackgroundJobRepository['updateProgress']>[1],
    items?: BackgroundJobItem[] | null
  ): Promise<void> {
    const updated = await this.jobRepo.updateProgress(id, patch);
    if (updated) this.jobProgressPublisher.publish(updated, 'job.progress', items);
  }

  private async fail(id: string, message: string): Promise<void> {
    const updated = await this.jobRepo.updateProgress(id, {
      status: 'failed',
      phase: 'failed',
      message,
      error: message,
      finishedAt: new Date(),
    });
    if (updated) {
      this.jobProgressPublisher.publish(updated, 'job.failed');
      void this.notifyTerminal(updated);
    }
  }

  private async notifyTerminal(job: BackgroundJob): Promise<void> {
    if (!this.notifyItemJobCompletion) return;
    try {
      await this.notifyItemJobCompletion.execute(job);
    } catch (err) {
      console.error('[Jobs] Failed to notify item job completion:', err);
    }
  }
}
