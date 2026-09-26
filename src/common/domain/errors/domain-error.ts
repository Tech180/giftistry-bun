import { DOMAIN_ERROR_STATUS } from './constants/domain-error-status.constant';
import type { DomainErrorCode } from './types/domain-error-code.type';

/**
 * Domain/application error with a stable machine code.
 * HTTP status is mapped at the presentation edge (`handleError`), not here.
 * `statusCode` is retained for backward-compatible assertions and adapters.
 */
export class DomainError extends Error {
  readonly errorCode: DomainErrorCode;

  constructor(message: string, errorCode: DomainErrorCode = 'BAD_REQUEST') {
    super(message);
    this.name = 'DomainError';
    this.errorCode = errorCode;
  }

  /** Convenience HTTP status derived from `errorCode` (edge mapping is authoritative). */
  get statusCode(): number {
    return DOMAIN_ERROR_STATUS[this.errorCode] ?? 400;
  }
}
