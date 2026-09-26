/** Allowlisted experimental feature wire keys (PascalCase). Keep in sync with SPA registry. */
export const EXPERIMENTAL_FEATURE_API_KEYS = ['ProductTutorial'] as const;

export type ExperimentalFeatureApiKey = (typeof EXPERIMENTAL_FEATURE_API_KEYS)[number];

export type ExperimentalFeaturesMap = Partial<Record<ExperimentalFeatureApiKey, boolean>>;
