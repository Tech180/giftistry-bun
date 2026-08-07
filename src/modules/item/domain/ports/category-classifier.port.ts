export interface CategoryClassificationResult {
  category: string;
  alternatives: string[];
}

export interface CategoryClassifierInput {
  url: string;
  websiteName: string;
  pageContext: string;
  itemName: string;
  /** Categories already used on this wishlist — prefer when they fit. */
  existingCategories?: string[];
}

export type CategoryClassifierDeltaHandler = (delta: {
  tokensPerSecond: number | null;
}) => void | Promise<void>;

export interface CategoryClassifierConfig {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
  customPrompt: string;
  onDelta?: CategoryClassifierDeltaHandler;
}

export interface CategoryClassifier {
  classify(
    input: CategoryClassifierInput,
    config: CategoryClassifierConfig
  ): Promise<CategoryClassificationResult>;
}
