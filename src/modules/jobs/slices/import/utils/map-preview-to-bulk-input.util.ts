import type { ImportedItemPreview } from '@/modules/item';
import { mapImportedPreviewToBulkFields } from '@/modules/item';

export function mapPreviewToBulkInput(item: ImportedItemPreview) {
  return mapImportedPreviewToBulkFields(item);
}
