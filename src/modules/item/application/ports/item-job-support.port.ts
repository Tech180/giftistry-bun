import type { UseCases } from '../interfaces/use-cases.interface';

/**
 * Published contract for background jobs that touch items.
 * Narrower than the full UseCases bag — only the methods jobs call.
 */
export type ItemJobSupportPort = Pick<
  UseCases,
  | 'extractMetadata'
  | 'updateItem'
  | 'promoteScrapedImageToPhotos'
  | 'listItems'
  | 'addItem'
  | 'summarizeItemDescription'
  | 'parseImportPreview'
  | 'bulkAddItems'
>;
