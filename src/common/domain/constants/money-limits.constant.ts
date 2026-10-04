/** Matches Postgres DECIMAL(10, 2) for extracted_price and claims.amount. */
export const MONEY_MAX_AMOUNT = 99_999_999.99;

export const MONEY_SCALE = 2;

export const MONEY_AMOUNT_OUT_OF_RANGE_MESSAGE = `Amount must be between 0 and ${MONEY_MAX_AMOUNT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
