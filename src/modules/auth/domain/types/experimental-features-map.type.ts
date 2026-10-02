import type { ExperimentalFeatureApiKey } from './experimental-feature-api-key.type';

export type ExperimentalFeaturesMap = Partial<Record<ExperimentalFeatureApiKey, boolean>>;
