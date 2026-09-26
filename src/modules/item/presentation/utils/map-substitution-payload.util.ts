import type { CreateSubstitutionPayload } from '../../slices/substitutions/interfaces/create-substitution-payload.interface';
import type { RawSubstitutionProductRequest } from '../interfaces/raw-substitution-product-request.interface';
import { mapItemMetadata } from './map-item-metadata.util';

export function mapSubstitutionPayload(
  raw: RawSubstitutionProductRequest
): CreateSubstitutionPayload {
  return {
    Name: raw.Name,
    Description: raw.Description,
    LinkUrl: raw.LinkUrl,
    Price: raw.Price !== undefined && raw.Price !== null ? Number(raw.Price) : raw.Price,
    WebsiteName: raw.WebsiteName,
    Category: raw.Category,
    PriorityId: raw.PriorityId,
    Priority:
      raw.Priority !== undefined && raw.Priority !== null ? Number(raw.Priority) : raw.Priority,
    IsHiddenIdea: raw.IsHiddenIdea,
    Metadata: mapItemMetadata(raw.Metadata) ?? null,
  };
}
