import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import { MAX_BULK_ADD_BATCH } from '@/modules/item/application/bulk-add-items.use-case';
import type { ItemUseCases } from '@/modules/item/application/item-use-cases.interface';
import type { CreateWishlistUseCase } from '@/modules/wishlist/application/create-wishlist.use-case';
import type { ImportedItemPreview } from '@/modules/item/domain/imported-item-preview';
import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';
import type { BackgroundJob, BackgroundJobItem } from '../domain/background-job.entity';
import type { JobProgressPublisher } from '../domain/ports/job-progress-publisher.port';
import { withJobHeartbeat } from './with-job-heartbeat.util';
import { mergeGrabInfoDescription } from './merge-grab-info-description.util';
import { resolveDesiredQuantity } from '@/modules/item/domain/parse-pack-quantity.util';

const GRAB_CONCURRENCY = 3;

export function importItemDedupeKey(name: string, linkUrl?: string | null): string {
  return `${name.trim().toLowerCase()}\0${(linkUrl || '').trim().toLowerCase()}`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function encodeImportDescription(item: ImportedItemPreview): string | null {
  const text = item.description?.trim() || '';
  const qty =
    resolveDesiredQuantity(item.desiredQuantity, item.name, item.description) ?? null;
  const needsMeta = item.isFavorite === true || (qty != null && qty > 1);
  if (!needsMeta) {
    return text || null;
  }
  const metadata: Record<string, unknown> = {};
  if (text) metadata.Text = text;
  if (item.isFavorite) metadata.IsFavorite = true;
  if (qty != null && qty > 1) {
    metadata.DesiredQuantity = qty;
    metadata.MultiCount = true;
  }
  return JSON.stringify(metadata);
}

function mapPreviewToBulkInput(item: ImportedItemPreview) {
  return {
    name: item.name.trim(),
    description: encodeImportDescription(item),
    linkUrl: item.websiteLink?.trim() || null,
    price: item.price ?? null,
    category: item.category?.trim() || null,
    priority: item.priority ?? null,
  };
}

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

function jobItemDedupeKey(item: BackgroundJobItem): string {
  const payload = item.Payload || {};
  const name = String(payload.name ?? '');
  const linkUrl = String(payload.linkUrl ?? item.LinkUrl ?? '');
  return importItemDedupeKey(name, linkUrl);
}

type CreatedRow = {
  itemId: string;
  linkUrl: string | null;
  name: string;
  description: string | null;
  category: string;
  priority: number | null;
  price: number | null;
  websiteName: string | null;
};

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      await worker(items[current]);
    }
  });
  await Promise.all(runners);
}

export class RunWishlistImportJobUseCase {
  constructor(
    private jobRepo: BackgroundJobRepository,
    private itemUseCases: ItemUseCases,
    private createWishlist: CreateWishlistUseCase,
    private jobProgressPublisher: JobProgressPublisher
  ) {}

  async execute(job: BackgroundJob): Promise<void> {
    try {
      if (await this.jobRepo.shouldStop(job.Id)) return;

      const payload = job.Payload;
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
        const hasGrabWork =
          payload.grabInfo &&
          jobItems.some(
            (item) =>
              (item.Status === 'pending' ||
                item.Status === 'failed' ||
                item.Status === 'running') &&
              !!(item.LinkUrl?.trim() || String(item.Payload?.linkUrl ?? '').trim())
          );

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
      const hasGrabWork =
        payload.grabInfo &&
        jobItems.some(
          (item) =>
            item.Status === 'pending' &&
            !!(item.LinkUrl?.trim() || String(item.Payload?.linkUrl ?? '').trim())
        );

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
    const payload = job.Payload;
    return withJobHeartbeat(
      this.jobRepo,
      job.Id,
      this.itemUseCases.parseImportPreview.execute(job.UserId, {
        listId: payload.mode === 'existing-list' ? payload.listId || undefined : undefined,
        fileName: payload.fileName,
        format: (payload.format as never) || undefined,
        content: payload.content,
        contentEncoding: payload.contentEncoding,
      })
    );
  }

  private async partitionPreviewAgainstExisting(
    job: BackgroundJob,
    listId: string,
    validItems: ImportedItemPreview[],
    existingItems: BackgroundJobItem[]
  ): Promise<{ remainder: ImportedItemPreview[]; orphanedOnList: CreatedRow[] }> {
    const jobKeys = new Set(existingItems.map(jobItemDedupeKey));

    let wishlistByLink = new Map<string, { itemId: string; name: string; description: string | null; category: string; priority: number | null; price: number | null; websiteName: string | null; linkUrl: string }>();
    try {
      const listItems = await this.itemUseCases.listItems.execute(listId, job.UserId);
      for (const item of listItems) {
        for (const link of item.Links ?? []) {
          const key = (link.Url || '').trim().toLowerCase();
          if (!key || wishlistByLink.has(key)) continue;
          wishlistByLink.set(key, {
            itemId: item.Id,
            name: item.Name,
            description: item.Description,
            category: item.Category || 'uncategorized',
            priority: item.Priority ?? null,
            price: link.ExtractedPrice ?? null,
            websiteName: link.RetailerName ?? null,
            linkUrl: link.Url,
          });
        }
      }
    } catch {
      wishlistByLink = new Map();
    }

    const remainder: ImportedItemPreview[] = [];
    const orphanedOnList: CreatedRow[] = [];
    const seenOrphanIds = new Set<string>();

    for (const item of validItems) {
      const key = importItemDedupeKey(item.name, item.websiteLink);
      if (jobKeys.has(key)) continue;

      const link = item.websiteLink?.trim().toLowerCase();
      const onList = link ? wishlistByLink.get(link) : undefined;
      if (onList) {
        if (!seenOrphanIds.has(onList.itemId)) {
          seenOrphanIds.add(onList.itemId);
          orphanedOnList.push({
            itemId: onList.itemId,
            linkUrl: onList.linkUrl,
            name: onList.name,
            description: onList.description,
            category: onList.category,
            priority: onList.priority,
            price: onList.price,
            websiteName: onList.websiteName,
          });
        }
        continue;
      }

      remainder.push(item);
    }

    return { remainder, orphanedOnList };
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
      const result = await this.itemUseCases.bulkAddItems.execute(
        listId,
        job.UserId,
        role,
        chunk
      );
      createdCount += result.created;
      failedCount += result.failed.length;

      const failedIndexes = new Set(result.failed.map((f) => f.index));
      const createdRows: CreatedRow[] = [];
      let createdIndex = 0;
      for (let rowIndex = 0; rowIndex < chunk.length; rowIndex++) {
        if (failedIndexes.has(rowIndex)) continue;
        const created = result.items[createdIndex++] as {
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
        };
        if (!created) continue;
        const link = created.Links?.[0];
        createdRows.push({
          itemId: created.Id,
          linkUrl: link?.Url ?? chunk[rowIndex].linkUrl ?? null,
          name: created.Name,
          description: created.Description ?? null,
          category: created.Category || 'uncategorized',
          priority: created.Priority ?? null,
          price: link?.ExtractedPrice ?? chunk[rowIndex].price ?? null,
          websiteName: link?.RetailerName ?? null,
        });
      }

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

  private async insertJobItemsIdempotent(jobId: string, rows: CreatedRow[]): Promise<void> {
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

    const workRows: CreatedRow[] = [];
    for (const item of jobItems) {
      if (item.Status !== 'pending' && item.Status !== 'failed') continue;
      const linkUrl =
        item.LinkUrl?.trim() || String(item.Payload?.linkUrl ?? '').trim() || null;
      if (!linkUrl || !item.ItemId) continue;
      const payload = item.Payload || {};
      workRows.push({
        itemId: item.ItemId,
        linkUrl,
        name: String(payload.name ?? 'Item'),
        description: (payload.description as string | null) ?? null,
        category: String(payload.category ?? 'uncategorized'),
        priority: (payload.priority as number | null) ?? null,
        price: (payload.price as number | null) ?? null,
        websiteName: (payload.websiteName as string | null) ?? null,
      });
    }

    const addDone = jobItems.length;
    const alreadyDone = jobItems.filter((item) => item.Status === 'done').length;
    const linkedCount = alreadyDone + workRows.length;

    if (workRows.length === 0) {
      await this.completeGrab(job.Id, counts, addDone, linkedCount, 0, jobItems);
      return;
    }

    let completed = alreadyDone;
    let grabFailed = 0;

    await this.patch(
      job.Id,
      {
        phase: 'grabbing_info',
        message: `Grabbing info ${completed}/${linkedCount}…`,
        progressDone: addDone + completed,
        progressTotal: addDone + linkedCount,
      },
      jobItems
    );

    await mapPool(workRows, GRAB_CONCURRENCY, async (row) => {
      if (await this.jobRepo.shouldStop(job.Id)) return;
      const jobItem = byItemId.get(row.itemId);
      if (jobItem) {
        jobItem.Status = 'running';
        await this.jobRepo.updateItemStatus(jobItem.Id, 'running');
        await this.patch(
          job.Id,
          {
            progressDone: addDone + completed,
            progressTotal: addDone + linkedCount,
            message: `Grabbing info ${completed}/${linkedCount}…`,
          },
          jobItems
        );
      }
      try {
        const extract = await withJobHeartbeat(
          this.jobRepo,
          job.Id,
          this.itemUseCases.extractMetadata.execute(row.linkUrl!, job.UserId, { listId })
        );
        const name = mergeString(extract.data.title, row.name, row.name);
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
        const category = mergeString(extract.data.category, row.category, row.category);
        const price = extract.data.price != null ? extract.data.price : row.price;
        const websiteName =
          mergeString(extract.websiteName, row.websiteName, '') || null;

        await this.itemUseCases.updateItem.execute(
          row.itemId,
          job.UserId,
          name,
          description,
          null,
          category,
          row.priority,
          undefined,
          row.linkUrl,
          price,
          websiteName
        );
        if (jobItem) {
          jobItem.Status = 'done';
          await this.jobRepo.updateItemStatus(jobItem.Id, 'done');
        }
      } catch (err) {
        grabFailed += 1;
        if (jobItem) {
          jobItem.Status = 'failed';
          jobItem.Error = err instanceof Error ? err.message : 'Grab failed';
          await this.jobRepo.updateItemStatus(jobItem.Id, 'failed', jobItem.Error);
        }
      } finally {
        completed += 1;
        await this.patch(
          job.Id,
          {
            progressDone: addDone + completed,
            progressTotal: addDone + linkedCount,
            message: `Grabbing info ${completed}/${linkedCount}…`,
          },
          jobItems
        );
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
    const message =
      grabFailed > 0
        ? `Import finished — ${created} item${created === 1 ? '' : 's'} added, ${grabFailed} grab failure${grabFailed === 1 ? '' : 's'}`
        : `Import finished — ${created} item${created === 1 ? '' : 's'} added`;

    const updated = await this.jobRepo.updateProgress(jobId, {
      status: 'completed',
      phase: 'completed',
      message,
      progressDone: addDone + linkedCount,
      progressTotal: addDone + linkedCount,
      finishedAt: new Date(),
      result: {
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
    const updated = await this.jobRepo.updateProgress(jobId, {
      status: 'completed',
      phase: 'completed',
      message: 'Import finished',
      progressDone: createdCount,
      progressTotal: Math.max(progressTotal, createdCount),
      finishedAt: new Date(),
      result: { Created: createdCount, Failed: failedCount },
    });
    if (updated) this.jobProgressPublisher.publish(updated, 'job.completed');
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
    if (updated) this.jobProgressPublisher.publish(updated, 'job.failed');
  }
}
