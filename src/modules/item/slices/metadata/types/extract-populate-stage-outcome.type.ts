import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';

export type ExtractPopulateStageOutcome =
  | { kind: 'empty' }
  | { kind: 'success'; finalData: ExtractedMetadata; droppedFields: string[] };
