import { t } from 'elysia';
import { MONEY_MAX_AMOUNT } from '@/common/domain/constants/money-limits.constant';

export const moneyNumericSchema = t.Optional(
  t.Nullable(t.Numeric({ minimum: 0, maximum: MONEY_MAX_AMOUNT }))
);
