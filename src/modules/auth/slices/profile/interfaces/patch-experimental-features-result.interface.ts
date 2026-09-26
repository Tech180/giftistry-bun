import type { SafeUser } from '../../../domain/types/safe-user.type';
import type { ExperimentalFeaturesMap } from '../../../domain/constants/experimental-feature-keys.constant';

export interface PatchExperimentalFeaturesResult {
  ExperimentalFeatures: ExperimentalFeaturesMap;
  User: SafeUser;
}
