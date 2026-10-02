export interface CompilePopulatePromptOptions {
  profile?: 'full' | 'compact';
  /** Defaults to true when profile is full, false when compact. */
  includeCategoryHub?: boolean;
}
