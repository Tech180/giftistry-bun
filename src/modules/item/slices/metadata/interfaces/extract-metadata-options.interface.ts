import type { ExtractMetadataProgress } from './extract-metadata-progress.interface';

export interface ExtractMetadataOptions {
  listId?: string;
  onProgress?: (update: ExtractMetadataProgress) => void | Promise<void>;
}
