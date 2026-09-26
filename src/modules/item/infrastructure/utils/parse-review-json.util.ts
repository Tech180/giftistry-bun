import type { ReviewData } from '../../domain/interfaces/review-data.interface';

export function parseReviewJson(text: string): ReviewData {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?/i, '');
    clean = clean.replace(/```$/, '');
    clean = clean.trim();
  }
  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const rawReviews = Array.isArray(parsed.Reviews) ? parsed.Reviews : [];
  const reviews = rawReviews
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      author: typeof entry.Author === 'string' ? entry.Author : '',
      rating: typeof entry.Rating === 'number' ? entry.Rating : Number(entry.Rating) || 0,
      content: typeof entry.Content === 'string' ? entry.Content : '',
      type: entry.Type === 'negative' ? ('negative' as const) : ('positive' as const),
    }));

  return {
    summary: typeof parsed.Summary === 'string' ? parsed.Summary : '',
    pros: Array.isArray(parsed.Pros)
      ? parsed.Pros.filter((p): p is string => typeof p === 'string')
      : [],
    cons: Array.isArray(parsed.Cons)
      ? parsed.Cons.filter((c): c is string => typeof c === 'string')
      : [],
    reviews,
  };
}
