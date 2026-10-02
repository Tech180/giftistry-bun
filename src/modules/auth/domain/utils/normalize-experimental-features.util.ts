import { EXPERIMENTAL_FEATURE_API_KEYS } from '../constants/experimental-feature-keys.constant';
import type { ExperimentalFeatureApiKey } from '../types/experimental-feature-api-key.type';
import type { ExperimentalFeaturesMap } from '../types/experimental-features-map.type';

export function isExperimentalFeatureApiKey(value: unknown): value is ExperimentalFeatureApiKey {
  return (
    typeof value === 'string' &&
    (EXPERIMENTAL_FEATURE_API_KEYS as readonly string[]).includes(value)
  );
}

export function normalizeExperimentalFeatures(raw: unknown): ExperimentalFeaturesMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const record = raw as Record<string, unknown>;
  const result: ExperimentalFeaturesMap = {};

  for (const key of EXPERIMENTAL_FEATURE_API_KEYS) {
    const value = record[key] ?? record[key.charAt(0).toLowerCase() + key.slice(1)];
    if (typeof value === 'boolean') {
      result[key] = value;
    }
  }

  return result;
}

export function mergeExperimentalFeatures(
  current: ExperimentalFeaturesMap | undefined,
  patch: ExperimentalFeaturesMap
): ExperimentalFeaturesMap {
  return {
    ...(current ?? {}),
    ...patch,
  };
}
