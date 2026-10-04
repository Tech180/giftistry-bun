import { Money } from '../money.vo';

/** Validates and normalizes a monetary amount for persistence. Returns null when empty. */
export function parseMoneyAmount(raw: number | string | null | undefined): number | null {
  const money = Money.create(raw);
  return money?.toNumber() ?? null;
}

/** Validates price/amount before writes; throws DomainError when out of range. */
export function assertMoneyAmount(raw: number | string | null | undefined): number | null {
  return parseMoneyAmount(raw);
}
