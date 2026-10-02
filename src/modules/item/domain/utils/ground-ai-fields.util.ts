import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';
import type { GroundAiFieldsResult } from '../interfaces/ground-ai-fields-result.interface';
import { descriptionSupportedByEvidence } from './description-grounding.util';
import { normalizeGiftFacingTitle } from './normalize-gift-facing-title.util';

function evidenceContains(evidence: string, value: string): boolean {
  const needle = value.trim();
  if (!needle) return false;
  return evidence.toLowerCase().includes(needle.toLowerCase());
}

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function titlesOverlap(aiTitle: string, evidence: string, scrapeTitle: string): boolean {
  const ai = aiTitle.trim();
  if (!ai) return true;

  const ev = evidence.trim();
  if (ev.toLowerCase().includes(ai.toLowerCase())) {
    return true;
  }

  const anchors = [
    scrapeTitle.trim(),
    evidence.match(/page title:\s*(.+)/i)?.[1]?.trim(),
    evidence.match(/product name:\s*(.+)/i)?.[1]?.trim(),
    evidence.match(/title:\s*(.+)/i)?.[1]?.trim(),
    evidence.match(/"title"\s*:\s*"([^"]+)"/i)?.[1]?.trim(),
  ].filter((v): v is string => Boolean(v));

  const aiTokens = new Set(significantTokens(ai));
  if (aiTokens.size === 0) return true;

  const minOverlap = scrapeTitle.trim() ? 2 : 1;

  for (const anchor of anchors) {
    const anchorTokens = significantTokens(anchor);
    if (anchorTokens.length === 0) continue;
    const overlap = anchorTokens.filter((t) => aiTokens.has(t)).length;
    if (overlap >= Math.min(minOverlap, anchorTokens.length)) {
      return true;
    }
    if (ai.toLowerCase().includes(anchor.toLowerCase()) || anchor.toLowerCase().includes(ai.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function readModelNumber(data: ExtractedMetadata): string | null {
  const fromPre = data.predefinedFields?.ModelNumber?.trim();
  if (fromPre) return fromPre;
  const fromUser = data.userDefinedFields?.ModelNumber?.trim();
  return fromUser || null;
}

function readBrand(data: ExtractedMetadata): string | null {
  const fromUser = data.userDefinedFields?.Brand?.trim();
  if (fromUser) return fromUser;
  if (data.brand?.trim()) return data.brand.trim();
  return data.predefinedFields?.Brand?.trim() || null;
}

function dropField(
  dropped: string[],
  field: string,
  apply: () => void
): void {
  apply();
  dropped.push(field);
}

/** Drops AI fields that are not supported by page/search evidence text. */
export function groundAiFields(
  ai: ExtractedMetadata,
  evidence: string,
  scrapeTitle: string
): GroundAiFieldsResult {
  const droppedFields: string[] = [];
  const grounded: ExtractedMetadata = {
    ...ai,
    predefinedFields: { ...(ai.predefinedFields ?? {}) },
    userDefinedFields: { ...(ai.userDefinedFields ?? {}) },
  };

  const ev = evidence.trim();

  if (grounded.color?.trim() && !evidenceContains(ev, grounded.color)) {
    dropField(droppedFields, 'color', () => {
      grounded.color = null;
    });
  }

  if (grounded.size?.trim() && !evidenceContains(ev, grounded.size)) {
    dropField(droppedFields, 'size', () => {
      grounded.size = null;
    });
  }

  const brand = readBrand(grounded);
  if (brand && !evidenceContains(ev, brand)) {
    dropField(droppedFields, 'brand', () => {
      if (grounded.userDefinedFields?.Brand) delete grounded.userDefinedFields.Brand;
      if (grounded.predefinedFields?.Brand) delete grounded.predefinedFields.Brand;
      grounded.brand = undefined;
    });
  }

  const model = readModelNumber(grounded);
  if (model && !evidenceContains(ev, model)) {
    dropField(droppedFields, 'model', () => {
      if (grounded.predefinedFields?.ModelNumber) delete grounded.predefinedFields.ModelNumber;
      if (grounded.userDefinedFields?.ModelNumber) delete grounded.userDefinedFields.ModelNumber;
    });
  }

  if (grounded.imageUrl?.trim()) {
    const image = grounded.imageUrl.trim();
    const inEvidence =
      ev.includes(image) ||
      [...ev.matchAll(/https?:\/\/[^\s"'<>]+/gi)]
        .map((m) => m[0])
        .some((url) => url === image || image.includes(url) || url.includes(image));
    if (!inEvidence) {
      dropField(droppedFields, 'imageUrl', () => {
        grounded.imageUrl = null;
      });
    }
  }

  if (
    grounded.description?.trim() &&
    !descriptionSupportedByEvidence(grounded.description, ev, scrapeTitle)
  ) {
    dropField(droppedFields, 'description', () => {
      grounded.description = null;
    });
  }

  const normalizedScrapeTitle = scrapeTitle.replace(/\s+/g, ' ').trim();
  if (
    normalizedScrapeTitle &&
    grounded.title?.replace(/\s+/g, ' ').trim() === normalizedScrapeTitle
  ) {
    grounded.title = normalizeGiftFacingTitle(grounded.title);
  }

  if (grounded.title?.trim() && !titlesOverlap(grounded.title, ev, scrapeTitle)) {
    dropField(droppedFields, 'title', () => {
      grounded.title = '';
    });
  }

  return { metadata: grounded, droppedFields };
}
