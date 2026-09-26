/**
 * Detect pack / multi-buy quantity cues from product titles (e.g. "Socks x5", "pack of 6").
 * Ignores apparel waist×inseam patterns like "32x30".
 */
export function parsePackQuantity(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  const s = text.trim();

  const packOf = s.match(/\b(?:pack\s+of|qty|quantity)\s*[:=]?\s*(\d{1,2})\b/i);
  if (packOf) {
    return clampQty(Number(packOf[1]));
  }

  const nPack = s.match(/\b(\d{1,2})\s*-?\s*pack\b/i);
  if (nPack) {
    return clampQty(Number(nPack[1]));
  }

  // "x5" / "x 5" — require no digit immediately before x (rejects 32x30)
  const xPack = s.match(/(?<!\d)\bx\s*(\d{1,2})\b/i);
  if (xPack) {
    return clampQty(Number(xPack[1]));
  }

  return null;
}

function clampQty(n: number): number | null {
  if (!Number.isFinite(n) || n < 2 || n > 99) return null;
  return Math.floor(n);
}

export function resolveDesiredQuantity(
  aiQty: number | null | undefined,
  ...texts: Array<string | null | undefined>
): number | null {
  if (typeof aiQty === 'number' && Number.isFinite(aiQty)) {
    const clamped = clampQty(aiQty);
    if (clamped != null) return clamped;
  }
  for (const text of texts) {
    const parsed = parsePackQuantity(text);
    if (parsed != null) return parsed;
  }
  return null;
}
