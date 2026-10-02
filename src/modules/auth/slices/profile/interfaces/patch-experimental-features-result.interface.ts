import type { SafeUser } from '../../../domain/types/safe-user.type';
import type { ExperimentalFeaturesMap } from '../../../domain/types/experimental-features-map.type';

export interface PatchExperimentalFeaturesResult {
  ExperimentalFeatures: ExperimentalFeaturesMap;
  User: SafeUser;
}
