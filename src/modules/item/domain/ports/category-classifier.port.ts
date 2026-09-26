import type { CategoryClassificationResult } from '../interfaces/category-classification-result.interface';
import type { CategoryClassifierInput } from '../interfaces/category-classifier-input.interface';
import type { CategoryClassifierConfig } from '../interfaces/category-classifier-config.interface';

export interface CategoryClassifier {
  classify(
    input: CategoryClassifierInput,
    config: CategoryClassifierConfig
  ): Promise<CategoryClassificationResult>;
}
