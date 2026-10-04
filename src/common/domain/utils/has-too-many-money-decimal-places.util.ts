import { MONEY_SCALE } from '../constants/money-limits.constant';

export function hasTooManyMoneyDecimalPlaces(amount: number): boolean {
  const scaled = Math.round(amount * 10 ** MONEY_SCALE);
  return Math.abs(amount * 10 ** MONEY_SCALE - scaled) > 1e-9;
}
