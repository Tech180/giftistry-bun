import type { Availability } from '../types/availability.type';
import type { FieldValue } from '../interfaces/field-value.interface';
import type { ReconciledFields } from '../interfaces/reconciled-fields.interface';
import { FIELD_SOURCE_WEIGHT } from '../constants/field-source-weights.constant';

function weightedScore<T>(entry: FieldValue<T>): number {
  const w = FIELD_SOURCE_WEIGHT[entry.source] ?? 0.3;
  return entry.confidence * w;
}

function pickBest<T>(entries: FieldValue<T>[]): FieldValue<T> | null {
  if (entries.length === 0) {
    return null;
  }
  let best = entries[0]!;
  let bestScore = weightedScore(best);
  for (let i = 1; i < entries.length; i += 1) {
    const entry = entries[i]!;
    const score = weightedScore(entry);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

function voteAvailability(entries: FieldValue<Availability>[]): FieldValue<Availability> | null {
  if (entries.length === 0) {
    return null;
  }
  const tallies = new Map<Availability, { score: number; entry: FieldValue<Availability> }>();
  for (const entry of entries) {
    const prev = tallies.get(entry.value);
    const score = weightedScore(entry);
    if (!prev || score > prev.score) {
      tallies.set(entry.value, { score, entry });
    } else {
      tallies.set(entry.value, { score: prev.score + score, entry: prev.entry });
    }
  }
  let winner: { score: number; entry: FieldValue<Availability> } | null = null;
  for (const row of tallies.values()) {
    if (!winner || row.score > winner.score) {
      winner = row;
    }
  }
  return winner?.entry ?? null;
}

export function reconcileFields(input: {
  prices?: FieldValue<number>[];
  imageUrls?: FieldValue<string>[];
  availabilities?: FieldValue<Availability>[];
}): ReconciledFields {
  return {
    price: pickBest(input.prices ?? []),
    imageUrl: pickBest(input.imageUrls ?? []),
    availability: voteAvailability(input.availabilities ?? []),
  };
}
