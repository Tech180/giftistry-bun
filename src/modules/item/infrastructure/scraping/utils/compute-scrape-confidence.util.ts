import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeConfidence } from '../../../domain/types/scrape-confidence.type';
import { FIELD_PRIORITY } from '../constants/field-priority.constant';
import type { MetadataField } from '../extractors/interfaces/metadata-field.type';

export function computeFieldsFound(metadata: ExtractedMetadata): MetadataField[] {
  const found: MetadataField[] = [];
  for (const field of FIELD_PRIORITY) {
    const value = metadata[field];
    if (field === 'price') {
      if (value !== null) found.push(field);
    } else if (typeof value === 'string' && value.trim()) {
      found.push(field);
    }
  }
  return found;
}

export function computeConfidence(
  metadata: ExtractedMetadata,
  titleFromSlug: boolean
): ScrapeConfidence {
  const hasTitle = Boolean(metadata.title?.trim());
  const hasPrice = metadata.price !== null;
  const hasDescription = Boolean(metadata.description?.trim());
  const hasImage = Boolean(metadata.imageUrl?.trim());

  if (titleFromSlug && !hasPrice && !hasDescription) return 'low';
  if (hasTitle && hasPrice && (hasDescription || hasImage)) return 'high';
  if (hasTitle && (hasPrice || hasDescription || hasImage)) return 'medium';
  return 'low';
}
