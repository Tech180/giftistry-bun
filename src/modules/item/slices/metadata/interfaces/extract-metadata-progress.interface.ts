import type { ExtractMetadataPhase } from '../../../domain/types/extract-metadata-phase.type';

export interface ExtractMetadataProgress {
  phase: ExtractMetadataPhase;
  tokensPerSecond?: number | null;
}
