import type { BucketAggregates } from '../interfaces/bucket-aggregates.interface';
import type { FieldThresholdMap, ScrapeEvalThresholds } from '../interfaces/scrape-eval-thresholds.interface';
import type { ScrapeEvalReport } from '../interfaces/scrape-eval-report.interface';
import type { ScrapeEvalFieldName } from '../interfaces/scrape-field-name.type';

export interface ThresholdViolation {
  scope: string;
  field: ScrapeEvalFieldName;
  matchRate: number;
  minMatchRate: number;
}

function checkBucket(
  scope: string,
  bucket: BucketAggregates,
  thresholds: FieldThresholdMap | undefined,
  out: ThresholdViolation[]
): void {
  if (!thresholds) {
    return;
  }
  for (const [field, rule] of Object.entries(thresholds) as [
    ScrapeEvalFieldName,
    { minMatchRate: number },
  ][]) {
    const row = bucket.fields.find((f) => f.field === field);
    const matchRate = row?.matchRate ?? 1;
    if (matchRate + 1e-12 < rule.minMatchRate) {
      out.push({
        scope,
        field,
        matchRate,
        minMatchRate: rule.minMatchRate,
      });
    }
  }
}

export function collectThresholdViolations(
  report: ScrapeEvalReport,
  thresholds: ScrapeEvalThresholds
): ThresholdViolation[] {
  const violations: ThresholdViolation[] = [];
  checkBucket('overall', report.aggregates.overall, thresholds.overall, violations);

  for (const [platform, rules] of Object.entries(thresholds.byPlatform ?? {})) {
    const bucket = report.aggregates.byPlatform[platform];
    if (bucket) {
      checkBucket(`platform:${platform}`, bucket, rules, violations);
    }
  }

  for (const [tag, rules] of Object.entries(thresholds.byTag ?? {})) {
    const bucket = report.aggregates.byTag[tag];
    if (bucket) {
      checkBucket(`tag:${tag}`, bucket, rules, violations);
    }
  }

  return violations;
}

export function assertScrapeEvalThresholds(
  report: ScrapeEvalReport,
  thresholds: ScrapeEvalThresholds
): void {
  const violations = collectThresholdViolations(report, thresholds);
  if (violations.length > 0) {
    const msg = violations
      .map(
        (v) =>
          `${v.scope} ${v.field}: matchRate ${v.matchRate.toFixed(3)} < min ${v.minMatchRate}`
      )
      .join('; ');
    throw new Error(`Scrape eval thresholds failed: ${msg}`);
  }
}
