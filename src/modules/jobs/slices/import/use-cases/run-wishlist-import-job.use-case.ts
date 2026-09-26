import type { ImportedItemPreview } from '@/modules/item';
import { resolveDesiredQuantity } from '@/modules/item';
import { resolveImportCategoryWithOptimize } from '@/modules/item';
import { MAX_BULK_ADD_BATCH } from '@/modules/item';
import type { ItemJobSupportPort } from '@/modules/item';
import type { CreateWishlistUseCase } from '@/modules/wishlist';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import type { ServerConfigRepository } from '@/modules/system';
import { resolveGrabInfoConcurrency } from '@/modules/system';
import type { BackgroundJobRepository } from '../../../domain/ports/background-job.repository';
import type { BackgroundJob } from '../../../domain/interfaces/background-job.interface';
import type { BackgroundJobItem } from '../../../domain/interfaces/background-job-item.interface';
import type { WishlistImportJobPayload } from '../../../domain/interfaces/wishlist-import-job-payload.interface';
import type { JobProgressPublisher } from '../../../domain/ports/job-progress-publisher.port';
import { createThrottledAsync } from '../../../application/utils/create-throttled-async.util';
import { withJobHeartbeat } from '../../../application/utils/with-job-heartbeat.util';
import { mergeGrabInfoDescription } from '../../../application/utils/merge-grab-info-description.util';
import { mergePreferExtracted } from '../../../application/utils/merge-prefer-extracted.util';
import {
  failBackgroundJob,
  publishJobProgress,
} from '../../../application/utils/publish-job-update.util';
import { itemsPerSecondRate } from '../../../domain/utils/job-progress-rate.util';
import {
  clearGrabPhasePayloadPatch,
  grabPhasePayloadPatch,
} from '../../../domain/utils/grab-item-phase.util';
import type { CreatedImportRow } from '../interfaces/created-import-row.interface';
import { chunkArray } from '../utils/chunk-array.util';
import { buildWishlistLinkIndex } from '../utils/build-wishlist-link-index.util';
import { collectGrabWorkRows } from '../utils/collect-grab-work-rows.util';
import { createdRowsFromBulkChunk } from '../utils/created-rows-from-bulk-chunk.util';
import {
  formatImportGrabCompleteMessage,
  jobItemNeedsGrab,
  jobItemPendingGrab,
} from '../utils/import-complete-message.util';
import {
  buildImportParseResultFields,
  pickImportParseResultFields,
} from '../utils/import-parse-result-fields.util';
import { mapPool } from '../utils/map-pool.util';
import { mapPreviewToBulkInput } from '../utils/map-preview-to-bulk-input.util';
import { partitionPreviewAgainstExisting as partitionPreview } from '../utils/partition-preview-against-existing.util';

export class RunWishlistImportJobUseCase {
  constructor(
    private jobRepo: BackgroundJobRepository,
    private itemUseCases: ItemJobSupportPort,
    private createWishlist: CreateWishlistUseCase,
    private jobProgressPublisher: JobProgressPublisher,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(job: BackgroundJob): Promise<void> {
    try {
      if (await this.jobRepo.shouldStop(job.Id)) return;

      const payload = job.Payload as WishlistImportJobPayload;
      const existingItems = await this.jobRepo.listItems(job.Id);
      let listId = job.ListId || payload.listId || null;

      // Grab-only resume: items already inserted and phase was grabbing.
      if (
        listId &&
        existingItems.length > 0 &&
        payload.grabInfo &&
        job.Phase === 'grabbing_info'
      ) {
        await this.runGrabInfoPhase(job, listId, {
          createdCount: existingItems.length,
          failedCount: Number(job.Result?.Failed ?? 0),
        });
        return;
      }

      // Mid-add / post-add resume: list exists and some job items already landed.
      if (listId && existingItems.length > 0) {
        const preview = await this.parsePreview(job);
        if (await this.jobRepo.shouldStop(job.Id)) return;

        await this.patch(job.Id, {
          result: {
            ...pickImportParseResultFields(job.Result),
            ...buildImportParseResultFields(preview),
          },
        });

        const validItems = preview.items.filter((item) => item.name.trim());
        if (validItems.length === 0 && existingItems.length === 0) {
          await this.fail(job.Id, 'No items found in this file.');
          return;
        }

        const { remainder, orphanedOnList } = await this.partitionPreviewAgainstExisting(
          job,
          listId,
          validItems,
          existingItems
        );

        if (orphanedOnList.length > 0) {
          await this.insertJobItemsIdempotent(job.Id, orphanedOnList);
        }

        const access = await getListAccessContext(job.UserId, { listId }, 'collaborator');
        let createdCount = (await this.jobRepo.listItems(job.Id)).length;
        let failedCount = Number(job.Result?.Failed ?? 0);

        if (remainder.length > 0) {
          const addResult = await this.runAddItemsPhase(
            job,
            listId,
            access.role,
            remainder,
            { createdCount, failedCount, progressTotal: validItems.length || remainder.length }
          );
          if (!addResult) return;
          createdCount = addResult.createdCount;
          failedCount = addResult.failedCount;
        }

        const jobItems = await this.jobRepo.listItems(job.Id);
        const hasGrabWork = payload.grabInfo && jobItems.some(jobItemNeedsGrab);

        if (hasGrabWork) {
          await this.runGrabInfoPhase(job, listId, { createdCount, failedCount });
          return;
        }

        await this.completeWithoutGrab(job.Id, createdCount, failedCount, jobItems.length);
        return;
      }

      // Fresh run
      await this.patch(job.Id, {
        phase: 'parsing',
        message: 'Finding items…',
        progressDone: 0,
        progressTotal: 100,
      });

      const preview = await this.parsePreview(job);
      if (await this.jobRepo.shouldStop(job.Id)) return;

      await this.patch(job.Id, {
        result: buildImportParseResultFields(preview),
      });

      const validItems = preview.items.filter((item) => item.name.trim());
      if (validItems.length === 0) {
        await this.fail(job.Id, 'No items found in this file.');
        return;
      }

      if (payload.mode === 'create-list' && !listId) {
        await this.patch(job.Id, {
          phase: 'creating_list',
          message: 'Creating wishlist…',
          progressDone: 10,
        });
        const title =
          payload.title?.trim() ||
          preview.suggestedWishlistTitle?.trim() ||
          payload.fileName.replace(/\.[^.]+$/, '') ||
          'Imported Wishlist';
        const created = await this.createWishlist.execute(job.UserId, title);
        listId = created.Id;
        await this.patch(job.Id, { listId, progressDone: 20, message: 'Wishlist created' });
      }

      if (!listId) {
        await this.fail(job.Id, 'Wishlist is required for import.');
        return;
      }

      const access = await getListAccessContext(job.UserId, { listId }, 'collaborator');
      if (await this.jobRepo.shouldStop(job.Id)) return;

      const addResult = await this.runAddItemsPhase(
        job,
        listId,
        access.role,
        validItems,
        { createdCount: 0, failedCount: 0, progressTotal: validItems.length }
      );
      if (!addResult) return;

      const jobItems = await this.jobRepo.listItems(job.Id);
      const hasGrabWork = payload.grabInfo && jobItems.some(jobItemPendingGrab);

      if (hasGrabWork) {
        await this.runGrabInfoPhase(job, listId, {
          createdCount: addResult.createdCount,
          failedCount: addResult.failedCount,
        });
        return;
      }

      await this.completeWithoutGrab(
        job.Id,
        addResult.createdCount,
        addResult.failedCount,
        validItems.length
      );
    } catch (err) {
      await this.fail(job.Id, err instanceof Error ? err.message : 'Import failed');
    }
  }

  private parsePreview(job: BackgroundJob) {
    const payload = job.Payload as WishlistImportJobPayload;
    return withJobHeartbeat(
      this.jobRepo,
      job.Id,
      this.itemUseCases.parseImportPreview.execute(
        job.UserId,
        {
          listId: payload.mode === 'existing-list' ? payload.listId || undefined : undefined,
          fileName: payload.fileName,
          format: (payload.format as never) || undefined,
          content: payload.content,
          contentEncoding: payload.contentEncoding,
          allowAi: payload.allowAi !== false,
          optimizeCategories: payload.optimizeCategories === true,
        },
        async (update) => {
          await this.patch(job.Id, {
            phase: 'parsing',
            message: update.message,
            progressDone: update.progressDone,
            progressTotal: 100,
            progressRate: update.ProgressRate !== undefined ? update.ProgressRate : null,
          });
        }
      )
    );
  }

  private async partitionPreviewAgainstExisting(
    job: BackgroundJob,
    listId: string,
    validItems: ImportedItemPreview[],
    existingItems: BackgroundJobItem[]
  ): Promise<{ remainder: ImportedItemPreview[]; orphanedOnList: CreatedImportRow[] }> {
    let wishlistByLink = new Map();
    try {
      const { Items: listItems } = await this.itemUseCases.listItems.execute(
        listId,
        job.UserId
      );
      wishlistByLink = buildWishlistLinkIndex(listItems);
    } catch {
      wishlistByLink = new Map();
    }

    return partitionPreview(validItems, existingItems, wishlistByLink);
  }

  private async runAddItemsPhase(
    job: BackgroundJob,
    listId: string,
    role: string,
    previewItems: ImportedItemPreview[],
    state: { createdCount: number; failedCount: number; progressTotal: number }
  ): Promise<{ createdCount: number; failedCount: number } | null> {
    const bulkInputs = previewItems.map(mapPreviewToBulkInput);
    const chunks = chunkArray(bulkInputs, MAX_BULK_ADD_BATCH);
    const totalForProgress = Math.max(state.progressTotal, state.createdCount + previewItems.length);

    await this.patch(job.Id, {
      phase: 'adding_items',
      message: `Adding ${previewItems.length} items…`,
      progressDone: state.createdCount,
      progressTotal: totalForProgress,
    });

    let createdCount = state.createdCount;
    let failedCount = state.failedCount;

    for (let i = 0; i < chunks.length; i++) {
      if (await this.jobRepo.shouldStop(job.Id)) return null;
      const chunk = chunks[i];
      if (!chunk) continue;
      const result = await this.itemUseCases.bulkAddItems.execute(
        listId,
        job.UserId,
        role,
        chunk
      );
      createdCount += result.created;
      failedCount += result.failed.length;

      const failedIndexes = new Set(result.failed.map((f) => f.index));
      const createdRows = createdRowsFromBulkChunk({
        chunk,
        failedIndexes,
        createdItems: result.items as Array<{
          Id: string;
          Name: string;
          Description: string | null;
          Category: string;
          Priority?: number | null;
          Links?: Array<{
            Url: string;
            ExtractedPrice: number | null;
            RetailerName: string | null;
          }>;
        }>,
      });

      await this.insertJobItemsIdempotent(job.Id, createdRows);

      await this.patch(job.Id, {
        progressDone: createdCount,
        progressTotal: totalForProgress,
        message: `Added ${createdCount} items…`,
        result: { Created: createdCount, Failed: failedCount },
      });
    }

    return { createdCount, failedCount };
  }

  private async insertJobItemsIdempotent(jobId: string, rows: CreatedImportRow[]): Promise<void> {
    if (rows.length === 0) return;
    const existing = await this.jobRepo.listItems(jobId);
    const existingIds = new Set(
      existing.map((item) => item.ItemId).filter((id): id is string => !!id)
    );
    const fresh = rows.filter((row) => !existingIds.has(row.itemId));
    if (fresh.length === 0) return;

    await this.jobRepo.insertItems(
      jobId,
      fresh.map((row) => ({
        itemId: row.itemId,
        linkUrl: row.linkUrl,
        payload: row as unknown as Record<string, unknown>,
        status: row.linkUrl?.trim() ? 'pending' : 'skipped',
      }))
    );
  }

  private async runGrabInfoPhase(
    job: BackgroundJob,
    listId: string,
    counts: { createdCount: number; failedCount: number }
  ): Promise<void> {
    if (await this.jobRepo.shouldStop(job.Id)) return;

    const importPayload = job.Payload as WishlistImportJobPayload;
    const optimizeCategories = importPayload.optimizeCategories === true;

    let jobItems = await this.jobRepo.listItems(job.Id);
    for (const item of jobItems) {
      if (item.Status === 'running') {
        item.Status = 'pending';
        await this.jobRepo.updateItemStatus(item.Id, 'pending');
      }
    }
    jobItems = await this.jobRepo.listItems(job.Id);

    const byItemId = new Map(
      jobItems.filter((item) => item.ItemId).map((item) => [item.ItemId as string, item])
    );

    const workRows = collectGrabWorkRows(jobItems);

    const addDone = jobItems.length;
    const alreadyDone = jobItems.filter((item) => item.Status === 'done').length;
    const linkedCount = alreadyDone + workRows.length;

    if (workRows.length === 0) {
      await this.completeGrab(job.Id, counts, addDone, linkedCount, 0, jobItems);
      return;
    }

    let completed = alreadyDone;
    let grabFailed = 0;
    const grabBaseline = alreadyDone;
    const grabStartedAt = Date.now();

    const grabProgressRate = () =>
      itemsPerSecondRate(completed - grabBaseline, Date.now() - grabStartedAt);

    const publishGrabProgress = async () => {
      await this.patch(
        job.Id,
        {
          phase: 'grabbing_info',
          progressDone: addDone + completed,
          progressTotal: addDone + linkedCount,
          message: `Grabbing info ${completed}/${linkedCount}…`,
          progressRate: grabProgressRate(),
        },
        jobItems
      );
    };

    const throttle = createThrottledAsync(publishGrabProgress);

    const applyGrabItemProgress = async (
      jobItem: BackgroundJobItem,
      phase: 'scraping' | 'categorizing' | 'researching' | 'populating',
      tokensPerSecond?: number | null
    ) => {
      const patch = grabPhasePayloadPatch(phase, tokensPerSecond);
      jobItem.Payload = { ...jobItem.Payload, ...patch };
      await this.jobRepo.updateItemPayload(jobItem.Id, patch);
      throttle.schedule();
    };

    const clearGrabItemProgress = async (jobItem: BackgroundJobItem) => {
      const patch = clearGrabPhasePayloadPatch();
      jobItem.Payload = { ...jobItem.Payload, ...patch };
      await this.jobRepo.updateItemPayload(jobItem.Id, patch);
    };

    await this.patch(
      job.Id,
      {
        phase: 'grabbing_info',
        message: `Grabbing info ${completed}/${linkedCount}…`,
        progressDone: addDone + completed,
        progressTotal: addDone + linkedCount,
        progressRate: null,
      },
      jobItems
    );

    const grabConcurrency = resolveGrabInfoConcurrency(this.serverConfigRepo.load(), workRows.length);
    await mapPool(workRows, grabConcurrency, async (row) => {
      if (await this.jobRepo.shouldStop(job.Id)) return;
      const jobItem = byItemId.get(row.itemId);
      if (jobItem) {
        jobItem.Status = 'running';
        await this.jobRepo.updateItemStatus(jobItem.Id, 'running');
        await publishGrabProgress();
      }
      try {
        const extract = await withJobHeartbeat(
          this.jobRepo,
          job.Id,
          this.itemUseCases.extractMetadata.execute(row.linkUrl!, job.UserId, {
            listId,
            onProgress: async (update) => {
              if (!jobItem) return;
              await applyGrabItemProgress(
                jobItem,
                update.phase,
                update.tokensPerSecond
              );
            },
          })
        );
        const name = mergePreferExtracted(extract.data.title, row.name, row.name);
        const packQty = resolveDesiredQuantity(
          extract.data.desiredQuantity,
          name,
          row.name,
          extract.data.title
        );
        const description = mergeGrabInfoDescription(
          row.description,
          extract.data.description,
          extract.data.predefinedFields,
          extract.data.userDefinedFields,
          { desiredQuantity: packQty }
        );
        const category =
          resolveImportCategoryWithOptimize(
            row.category,
            extract.data.category,
            optimizeCategories
          ) ?? row.category;
        const price = extract.data.price != null ? extract.data.price : row.price;
        const websiteName =
          mergePreferExtracted(extract.websiteName, row.websiteName, '') || null;
        const resolvedLinkUrl = extract.finalUrl?.trim() || row.linkUrl;

        await this.itemUseCases.updateItem.execute(
          row.itemId,
          job.UserId,
          name,
          description,
          null,
          category,
          row.priority,
          undefined,
          resolvedLinkUrl,
          price,
          websiteName,
          undefined,
          undefined,
          null
        );
        await this.itemUseCases.promoteScrapedImageToPhotos.execute(
          row.itemId,
          extract.data.imageUrl
        );
        if (jobItem) {
          jobItem.Status = 'done';
          await this.jobRepo.updateItemStatus(jobItem.Id, 'done');
          await clearGrabItemProgress(jobItem);
        }
      } catch (err) {
        grabFailed += 1;
        if (jobItem) {
          // Soft-fail: spreadsheet item stays; mark skipped so resume does not hard-fail.
          jobItem.Status = 'skipped';
          jobItem.Error = err instanceof Error ? err.message : 'Grab failed';
          await this.jobRepo.updateItemStatus(jobItem.Id, 'skipped', jobItem.Error);
          await clearGrabItemProgress(jobItem);
        }
      } finally {
        completed += 1;
        throttle.cancel();
        await publishGrabProgress();
      }
    });

    if (await this.jobRepo.shouldStop(job.Id)) return;

    await this.completeGrab(job.Id, counts, addDone, linkedCount, grabFailed, jobItems);
  }

  private async completeGrab(
    jobId: string,
    counts: { createdCount: number; failedCount: number },
    addDone: number,
    linkedCount: number,
    grabFailed: number,
    jobItems: BackgroundJobItem[]
  ): Promise<void> {
    const created = counts.createdCount;
    const message = formatImportGrabCompleteMessage(created, grabFailed);

    const current = await this.jobRepo.findById(jobId);
    const updated = await this.jobRepo.updateProgress(jobId, {
      status: 'completed',
      phase: 'completed',
      message,
      progressDone: addDone + linkedCount,
      progressTotal: addDone + linkedCount,
      finishedAt: new Date(),
      progressRate: null,
      result: {
        ...pickImportParseResultFields(current?.Result),
        Created: counts.createdCount,
        Failed: counts.failedCount,
        GrabFailed: grabFailed,
      },
    });
    if (updated) {
      this.jobProgressPublisher.publish(updated, 'job.completed', jobItems);
    }
  }

  private async completeWithoutGrab(
    jobId: string,
    createdCount: number,
    failedCount: number,
    progressTotal: number
  ): Promise<void> {
    const current = await this.jobRepo.findById(jobId);
    const updated = await this.jobRepo.updateProgress(jobId, {
      status: 'completed',
      phase: 'completed',
      message: 'Import finished',
      progressDone: createdCount,
      progressTotal: Math.max(progressTotal, createdCount),
      finishedAt: new Date(),
      progressRate: null,
      result: {
        ...pickImportParseResultFields(current?.Result),
        Created: createdCount,
        Failed: failedCount,
      },
    });
    if (updated) this.jobProgressPublisher.publish(updated, 'job.completed');
  }

  private async patch(
    id: string,
    patch: Parameters<BackgroundJobRepository['updateProgress']>[1],
    items?: BackgroundJobItem[] | null
  ): Promise<void> {
    await publishJobProgress(this.jobRepo, this.jobProgressPublisher, id, patch, items);
  }

  private async fail(id: string, message: string): Promise<void> {
    await failBackgroundJob(this.jobRepo, this.jobProgressPublisher, id, message);
  }
}
