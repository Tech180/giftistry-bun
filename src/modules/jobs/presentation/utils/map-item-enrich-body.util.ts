import { AppError } from '@/common/domain/errors/app-error';
import type { ItemEnrichJobPayload } from '../../domain/interfaces/item-enrich-job-payload.type';

export function mapItemEnrichBodyToPayload(body: {
  Intent: 'create-from-url' | 'update-item' | 'draft-populate';
  ListId: string;
  Url: string;
  ItemId?: string | null;
}): ItemEnrichJobPayload {
  if (body.Intent === 'create-from-url') {
    return { intent: 'create-from-url', listId: body.ListId, url: body.Url };
  }
  if (body.Intent === 'update-item') {
    if (!body.ItemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }
    return {
      intent: 'update-item',
      listId: body.ListId,
      url: body.Url,
      itemId: body.ItemId,
      writeBack: true,
    };
  }
  return {
    intent: 'draft-populate',
    listId: body.ListId,
    url: body.Url,
    writeBack: false,
  };
}
