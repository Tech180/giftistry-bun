import type { ParseImportPreviewUseCase } from '../../slices/import/use-cases/parse-import-preview.use-case';
import type { BulkAddItemsUseCase } from '../../slices/import/use-cases/bulk-add-items.use-case';

/** Published contract: parse import preview + bulk-add for wishlist import jobs. */
export interface ItemImporterPort {
  parseImportPreview: Pick<ParseImportPreviewUseCase, 'execute'>;
  bulkAddItems: Pick<BulkAddItemsUseCase, 'execute'>;
}
