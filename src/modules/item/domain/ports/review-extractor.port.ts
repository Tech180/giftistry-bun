export interface ReviewEntry {
  author: string;
  rating: number;
  content: string;
  type: 'positive' | 'negative';
}

export interface ReviewData {
  summary: string;
  pros: string[];
  cons: string[];
  reviews: ReviewEntry[];
}

export interface ReviewExtractionInput {
  itemName: string;
  category: string;
  url: string;
}

export interface ReviewExtractorConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'local' | 'openrouter';
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
}

export interface ReviewExtractor {
  extract(input: ReviewExtractionInput, config: ReviewExtractorConfig): Promise<ReviewData>;
}
