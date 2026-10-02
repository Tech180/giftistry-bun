import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';
import type { ScrapeFieldSources } from '../interfaces/scrape-field-sources.interface';

/** Copy structured field provenance from extracted metadata into diagnostics. */
export function metadataFieldSourcesForDiagnostics(
  metadata: ExtractedMetadata
): ScrapeFieldSources | undefined {
  const sources = metadata.fieldSources;
  if (!sources || Object.keys(sources).length === 0) {
    return undefined;
  }
  return { ...sources };
}
