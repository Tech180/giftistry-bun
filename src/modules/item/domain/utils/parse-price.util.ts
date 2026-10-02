import type { ParsePriceHints } from '../interfaces/parse-price-hints.interface';
import type { ParsedPrice } from '../interfaces/parsed-price.interface';
import { CURRENCY_SYMBOLS } from '../constants/currency-symbols.constant';

function detectCurrency(raw: string): string | null {
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (raw.includes(symbol)) {
      return code;
    }
  }
  const iso = raw.match(/\b([A-Z]{3})\b/);
  return iso?.[1] ?? null;
}

function prefersEuropeanDecimals(hints?: ParsePriceHints): boolean {
  const locale = `${hints?.locale ?? ''} ${hints?.lang ?? ''} ${hints?.tld ?? ''}`.toLowerCase();
  return /de|fr|es|it|nl|pt|pl|eu|\.de|\.fr|\.es|\.it|\.nl/.test(locale);
}

function parseNumericToken(token: string, europeanBias: boolean): number | null {
  const cleaned = token.replace(/[^\d.,]/g, '');
  if (!cleaned) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized = cleaned;
  if (lastComma >= 0 && lastDot >= 0) {
    // Last separator is decimal
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    const decimals = cleaned.length - lastComma - 1;
    if (decimals === 3 && !europeanBias) {
      normalized = cleaned.replace(/,/g, '');
    } else if (decimals <= 2 || europeanBias) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastDot >= 0) {
    const decimals = cleaned.length - lastDot - 1;
    if (decimals === 3 && europeanBias) {
      normalized = cleaned.replace(/\./g, '');
    }
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * Locale-aware price parser.
 * `1.299,00 €` → 1299; `12,50` → 12.5; `$19.99 - $29.99` → low 19.99 with isRange.
 */
export function parsePrice(raw: unknown, hints?: ParsePriceHints): ParsedPrice | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { amount: raw, currency: null, isRange: false };
  }
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  const text = raw.trim();
  const currency = detectCurrency(text);
  const europeanBias = prefersEuropeanDecimals(hints);
  const rangeParts = text.split(/\s*[-–—]\s*/).filter(Boolean);
  if (rangeParts.length >= 2) {
    const low = parseNumericToken(rangeParts[0]!, europeanBias);
    const high = parseNumericToken(rangeParts[1]!, europeanBias);
    if (low != null && high != null) {
      return { amount: Math.min(low, high), currency, isRange: true };
    }
  }

  const amount = parseNumericToken(text, europeanBias);
  if (amount == null) {
    return null;
  }
  return { amount, currency, isRange: false };
}
