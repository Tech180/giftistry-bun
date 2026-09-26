import { AppError } from '@/common/domain/errors/app-error';
import { DomainError } from '@/common/domain/errors/domain-error';
import type { HandleErrorParams } from './interfaces/handle-error-params.interface';
import { asHttpError } from './utils/as-http-error.util';
import { statusForDomainCode } from './utils/status-for-domain-code.util';

export const handleError = ({ code, error, set, correlationId }: HandleErrorParams) => {
  if (error instanceof DomainError) {
    const statusCode = statusForDomainCode(error.errorCode);
    if (statusCode >= 500) {
      console.error(`[ERROR] [CorrelationId: ${correlationId || 'N/A'}] Unhandled API Error:`, error);
    } else {
      console.warn(`[WARN] [CorrelationId: ${correlationId || 'N/A'}] Client Error (${statusCode}/${error.errorCode}): ${error.message}`);
    }
    set.status = statusCode;
    return {
      Status: 'error',
      Code: error.errorCode,
      Message: error.message,
    };
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      console.error(`[ERROR] [CorrelationId: ${correlationId || 'N/A'}] Unhandled API Error:`, error);
    } else {
      console.warn(`[WARN] [CorrelationId: ${correlationId || 'N/A'}] Client Error (${error.statusCode}/${error.errorCode}): ${error.message}`);
    }
    set.status = error.statusCode;
    return {
      Status: 'error',
      Code: error.errorCode,
      Message: error.message,
      ...error.extra
    };
  }

  const httpError = asHttpError(error);
  const statusCode = httpError.status || httpError.statusCode || (code === 'NOT_FOUND' ? 404 : 500);
  if (statusCode >= 500) {
    console.error(`[ERROR] [CorrelationId: ${correlationId || 'N/A'}] Unhandled API Error:`, error);
  } else {
    console.warn(`[WARN] [CorrelationId: ${correlationId || 'N/A'}] Client Error (${statusCode}): ${httpError.message || error}`);
  }
  set.status = statusCode;
  return {
    Status: 'error',
    Code: httpError.code || code || 'INTERNAL_SERVER_ERROR',
    Message: httpError.message || 'An unexpected error occurred',
  };
};
