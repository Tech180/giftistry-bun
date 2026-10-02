import type { ExtractMetadataProgress } from './extract-metadata-progress.interface';
import type { ScrapeCaptureInput } from '../../../domain/interfaces/scrape-capture-input.interface';

export interface ExtractMetadataOptions {
  listId?: string;
  onProgress?: (update: ExtractMetadataProgress) => void | Promise<void>;
  deadlineMs?: number;
  /** When set, skip server fetch and extract from submitted HTML/JSON only. */
  capture?: ScrapeCaptureInput;
}
