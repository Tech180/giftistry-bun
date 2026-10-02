import type { ExperimentalFeatureApiKey } from '../types/experimental-feature-api-key.type';

/** Allowlisted experimental feature wire keys (PascalCase). Keep in sync with SPA registry. */
export const EXPERIMENTAL_FEATURE_API_KEYS = ['ProductTutorial'] as const satisfies readonly ExperimentalFeatureApiKey[];
