import type { ExperimentalFeaturesMap } from '../../../domain/types/experimental-features-map.type';

export interface PatchExperimentalFeaturesPayload {
  features: ExperimentalFeaturesMap;
}
