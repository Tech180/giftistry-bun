export interface CategoryClassifierInput {
  url: string;
  websiteName: string;
  pageContext: string;
  itemName: string;
}

export interface CategoryClassifierConfig {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
  customPrompt: string;
}

export interface CategoryClassifier {
  classify(input: CategoryClassifierInput, config: CategoryClassifierConfig): Promise<string>;
}
