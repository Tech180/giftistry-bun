import type { ReviewData } from '../interfaces/review-data.interface';
import type { ReviewExtractionInput } from '../interfaces/review-extraction-input.interface';
import type { ReviewExtractorConfig } from '../interfaces/review-extractor-config.interface';

export interface ReviewExtractor {
  extract(input: ReviewExtractionInput, config: ReviewExtractorConfig): Promise<ReviewData>;
}
