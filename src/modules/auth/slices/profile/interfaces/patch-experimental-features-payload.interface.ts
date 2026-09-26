import type { ExperimentalFeaturesMap } from '../../../domain/constants/experimental-feature-keys.constant';

export interface PatchExperimentalFeaturesPayload {
  features: ExperimentalFeaturesMap;
}
