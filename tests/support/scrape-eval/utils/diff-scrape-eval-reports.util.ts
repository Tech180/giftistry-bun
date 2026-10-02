import type { ScrapeEvalDiffEntry, ScrapeEvalDiffResult } from '../interfaces/scrape-eval-diff.interface';
import type { ScrapeEvalReport } from '../interfaces/scrape-eval-report.interface';

function approxEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon;
}

function pushDiff(
  out: ScrapeEvalDiffEntry[],
  path: string,
  baseline: unknown,
  report: unknown
): void {
  if (Object.is(baseline, report)) {
    return;
  }
  if (typeof baseline === 'number' && typeof report === 'number' && approxEqual(baseline, report)) {
    return;
  }
  out.push({ path, baseline, report });
}

/** Compare stable scoring slices (aggregates + per-entry field outcomes). */
export function diffScrapeEvalReports(
  baseline: ScrapeEvalReport,
  report: ScrapeEvalReport
): ScrapeEvalDiffResult {
  const differences: ScrapeEvalDiffEntry[] = [];

  for (const bucket of ['overall', 'byPlatform', 'byTag'] as const) {
    const bAgg = baseline.aggregates[bucket];
    const rAgg = report.aggregates[bucket];
    if (bucket === 'overall') {
      for (const bf of bAgg.fields) {
        const rf = rAgg.fields.find((f) => f.field === bf.field);
        if (!rf) {
          pushDiff(differences, `aggregates.overall.${bf.field}`, bf, undefined);
          continue;
        }
        pushDiff(
          differences,
          `aggregates.overall.${bf.field}.matchRate`,
          bf.matchRate,
          rf.matchRate
        );
        pushDiff(differences, `aggregates.overall.${bf.field}.matched`, bf.matched, rf.matched);
      }
      continue;
    }

    const bRecord = bAgg as Record<string, { fields: typeof baseline.aggregates.overall.fields }>;
    const rRecord = rAgg as Record<string, { fields: typeof report.aggregates.overall.fields }>;
    const keys = new Set([...Object.keys(bRecord), ...Object.keys(rRecord)]);
    for (const key of keys) {
      const bf = bRecord[key]?.fields ?? [];
      const rf = rRecord[key]?.fields ?? [];
      for (const fieldRow of bf) {
        const rfRow = rf.find((f) => f.field === fieldRow.field);
        pushDiff(
          differences,
          `aggregates.${bucket}.${key}.${fieldRow.field}.matchRate`,
          fieldRow.matchRate,
          rfRow?.matchRate
        );
      }
    }
  }

  const baselineById = new Map(baseline.entries.map((e) => [e.id, e]));
  for (const entry of report.entries) {
    const base = baselineById.get(entry.id);
    if (!base) {
      pushDiff(differences, `entries.${entry.id}`, undefined, entry.id);
      continue;
    }
    pushDiff(
      differences,
      `entries.${entry.id}.validation.valid`,
      base.validation.valid,
      entry.validation.valid
    );
    pushDiff(
      differences,
      `entries.${entry.id}.validation.blocked`,
      base.validation.blocked,
      entry.validation.blocked
    );
    if (entry.blockedExpectationMet !== undefined) {
      pushDiff(
        differences,
        `entries.${entry.id}.blockedExpectationMet`,
        base.blockedExpectationMet,
        entry.blockedExpectationMet
      );
    }
    for (const field of entry.fields) {
      const baseField = base.fields.find((f) => f.field === field.field);
      pushDiff(
        differences,
        `entries.${entry.id}.fields.${field.field}.matched`,
        baseField?.matched,
        field.matched
      );
      if (field.field === 'title' && field.score != null) {
        pushDiff(
          differences,
          `entries.${entry.id}.fields.title.score`,
          baseField?.score,
          field.score
        );
      }
    }
  }

  for (const id of baselineById.keys()) {
    if (!report.entries.some((e) => e.id === id)) {
      pushDiff(differences, `entries.${id}`, id, undefined);
    }
  }

  return { equal: differences.length === 0, differences };
}
