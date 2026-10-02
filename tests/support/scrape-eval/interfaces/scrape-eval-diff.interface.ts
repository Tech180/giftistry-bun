export interface ScrapeEvalDiffEntry {
  path: string;
  baseline: unknown;
  report: unknown;
}

export interface ScrapeEvalDiffResult {
  equal: boolean;
  differences: ScrapeEvalDiffEntry[];
}
