import type { CategoryClassificationResult } from '../../../domain/interfaces/category-classification-result.interface';

export interface CategoryResearchStageResult {
  aiCategoryResult: CategoryClassificationResult;
  searchContext: string | undefined;
}
