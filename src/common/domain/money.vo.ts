import { DomainError } from './errors/domain-error';

export class Money {
  private constructor(readonly amount: number) {}

  static create(raw: number | string | null | undefined): Money | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const amount = typeof raw === 'string' ? Number(raw.replace(/[^0-9.]/g, '')) : raw;
    if (isNaN(amount) || amount < 0) {
      throw new DomainError('Invalid monetary amount');
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
