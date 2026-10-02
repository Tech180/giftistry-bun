import type { UserRepository } from '../../../domain/ports/user.repository';
import { toSafeUser } from '../../../domain/utils/to-safe-user.util';
import { AppError } from '@/common/domain/errors/app-error';
import {
  isExperimentalFeatureApiKey,
  mergeExperimentalFeatures,
} from '../../../domain/utils/normalize-experimental-features.util';
import type { ExperimentalFeaturesMap } from '../../../domain/types/experimental-features-map.type';
import type { PatchExperimentalFeaturesPayload } from '../interfaces/patch-experimental-features-payload.interface';
import type { PatchExperimentalFeaturesResult } from '../interfaces/patch-experimental-features-result.interface';

export class PatchExperimentalFeaturesUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(
    userId: string,
    payload: PatchExperimentalFeaturesPayload
  ): Promise<PatchExperimentalFeaturesResult> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const patch = requireKnownFeatures(payload.features);
    const next = mergeExperimentalFeatures(user.ExperimentalFeatures, patch);
    const updated = await this.userRepo.setExperimentalFeatures(userId, next);

    return {
      ExperimentalFeatures: updated.ExperimentalFeatures ?? next,
      User: toSafeUser(updated),
    };
  }
}

function requireKnownFeatures(features: ExperimentalFeaturesMap): ExperimentalFeaturesMap {
  const result: ExperimentalFeaturesMap = {};
  for (const [key, value] of Object.entries(features)) {
    if (!isExperimentalFeatureApiKey(key)) {
      throw new AppError(`Unknown experimental feature: ${key}`, 400, 'BAD_REQUEST');
    }
    if (typeof value === 'boolean') {
      result[key] = value;
    }
  }
  return result;
}
