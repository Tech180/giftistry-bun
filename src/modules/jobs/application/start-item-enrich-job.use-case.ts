import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';
import type { ItemEnrichJobPayload } from '../domain/background-job.entity';
import { toJobPublicView } from '../domain/background-job.entity';
import type { ItemUseCases } from '@/modules/item/application/item-use-cases.interface';
import type { Item } from '@/modules/item/domain/item.entity';
import type { ListRoleLevel } from '@/common/domain/list-role.vo';
import { AppError } from '@/common/middlewares/error.middleware';
import { checkRateLimit } from '@/common/middlewares/rate-limit.middleware';

export interface StartItemEnrichJobResult {
  Job: Record<string, unknown>;
  Item?: Item;
}

function isValidUrl(url: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function placeholderNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const label = hostname.replace(/^www\./, '').split('.')[0] || '';
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Item';
  } catch {
    return 'Item';
  }
}

export class StartItemEnrichJobUseCase {
  constructor(
    private jobRepo: BackgroundJobRepository,
    private itemUseCases: ItemUseCases
  ) {}

  async execute(
    userId: string,
    payload: ItemEnrichJobPayload,
    rateLimitKey: string,
    listRole: ListRoleLevel
  ): Promise<StartItemEnrichJobResult> {
    checkRateLimit(rateLimitKey, { windowMs: 60000, max: 12 });

    if (!payload.listId) {
      throw new AppError('List ID is required', 400, 'BAD_REQUEST');
    }
    if (!payload.url?.trim() || !isValidUrl(payload.url)) {
      throw new AppError('A valid URL is required', 400, 'BAD_REQUEST');
    }

    if (payload.intent === 'create-from-url') {
      const name = placeholderNameFromUrl(payload.url);
      const isSuggestion = listRole !== 'owner';
      const isHiddenIdea = isSuggestion;
      const item = await this.itemUseCases.addItem.execute(
        payload.listId,
        name,
        null,
        null,
        isHiddenIdea,
        isSuggestion ? userId : null,
        payload.url,
        null,
        null,
        'uncategorized',
        isSuggestion,
        null,
        [],
        null
      );

      const job = await this.jobRepo.create({
        kind: 'item-enrich',
        userId,
        listId: payload.listId,
        payload,
      });
      const items = await this.jobRepo.insertItems(job.Id, [
        {
          itemId: item.Id,
          linkUrl: payload.url,
          payload: { name: item.Name, linkUrl: payload.url },
          status: 'pending',
        },
      ]);
      const started = (await this.jobRepo.updateProgress(job.Id, { progressTotal: 1 })) ?? job;

      return { Job: toJobPublicView(started, items), Item: item };
    }

    if (payload.intent === 'update-item') {
      if (!payload.itemId) {
        throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
      }

      const job = await this.jobRepo.create({
        kind: 'item-enrich',
        userId,
        listId: payload.listId,
        payload,
      });
      await this.jobRepo.insertItems(job.Id, [
        {
          itemId: payload.itemId,
          linkUrl: payload.url,
          payload: { linkUrl: payload.url },
          status: 'pending',
        },
      ]);
      const started = (await this.jobRepo.updateProgress(job.Id, { progressTotal: 1 })) ?? job;

      return { Job: toJobPublicView(started) };
    }

    // draft-populate: no item is created or mutated, just extract-and-return via the job result.
    const job = await this.jobRepo.create({
      kind: 'item-enrich',
      userId,
      listId: payload.listId,
      payload,
    });
    const started = (await this.jobRepo.updateProgress(job.Id, { progressTotal: 1 })) ?? job;

    return { Job: toJobPublicView(started) };
  }
}
