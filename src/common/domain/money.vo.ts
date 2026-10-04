import {
  MONEY_AMOUNT_OUT_OF_RANGE_MESSAGE,
  MONEY_MAX_AMOUNT,
} from './constants/money-limits.constant';
import { DomainError } from './errors/domain-error';
import { hasTooManyMoneyDecimalPlaces } from './utils/has-too-many-money-decimal-places.util';

export class Money {
  private constructor(readonly amount: number) {}

  static create(raw: number | string | null | undefined): Money | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const amount = typeof raw === 'string' ? Number(raw.replace(/[^0-9.]/g, '')) : raw;
    if (!Number.isFinite(amount) || amount < 0) {
      throw new DomainError(MONEY_AMOUNT_OUT_OF_RANGE_MESSAGE);
    }
    if (amount > MONEY_MAX_AMOUNT) {
      throw new DomainError(MONEY_AMOUNT_OUT_OF_RANGE_MESSAGE);
    }
    if (hasTooManyMoneyDecimalPlaces(amount)) {
      throw new DomainError(MONEY_AMOUNT_OUT_OF_RANGE_MESSAGE);
    }
    return new Money(amount);
  }

  static zero(): Money {
    return new Money(0);
  }

  toNumber(): number {
    return this.amount;
  }
}
