import type { BackgroundJobRepository } from '../../../domain/ports/background-job.repository';
import type { ItemEnrichJobPayload } from '../../../domain/interfaces/item-enrich-job-payload.type';
import { mapToJobPublicView } from '../../../application/utils/map-to-job-public-view.util';
import type { ItemJobSupportPort } from '@/modules/item';
import type { ListRoleLevel } from '@/common/domain/types/list-role-level.type';
import { AppError } from '@/common/domain/errors/app-error';
import { checkRateLimit } from '@/common/middlewares/utils/check-rate-limit.util';
import type { ServerConfigRepository } from '@/modules/system';
import type { StartItemEnrichJobResult } from '../interfaces/start-item-enrich-job-result.interface';
import { ITEM_ENRICH_RATE_LIMIT } from '../constants/rate-limit.constant';
import { isValidUrl } from '../utils/is-valid-url.util';
import { placeholderNameFromUrl } from '../utils/placeholder-name-from-url.util';

export class StartItemEnrichJobUseCase {
  constructor(
    private jobRepo: BackgroundJobRepository,
    private itemUseCases: ItemJobSupportPort,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(
    userId: string,
    payload: ItemEnrichJobPayload,
    rateLimitKey: string,
    listRole: ListRoleLevel
  ): Promise<StartItemEnrichJobResult> {
    checkRateLimit(rateLimitKey, ITEM_ENRICH_RATE_LIMIT);

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

      return {
        Job: mapToJobPublicView(started, items, this.serverConfigRepo),
        Item: item,
      };
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

      return { Job: mapToJobPublicView(started, null, this.serverConfigRepo) };
    }

    // draft-populate: no item is created or mutated, just extract-and-return via the job result.
    const job = await this.jobRepo.create({
      kind: 'item-enrich',
      userId,
      listId: payload.listId,
      payload,
    });
    const started = (await this.jobRepo.updateProgress(job.Id, { progressTotal: 1 })) ?? job;

    return { Job: mapToJobPublicView(started, null, this.serverConfigRepo) };
  }
}
