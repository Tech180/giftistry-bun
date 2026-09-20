export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errorCode: string = 'INTERNAL_SERVER_ERROR',
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface HandleErrorParams {
  code?: string | number;
  error: unknown;
  set: { status?: number | string };
  correlationId?: string;
}

interface UnknownHttpError {
  status?: number;
  statusCode?: number;
  code?: string;
  message?: string;
}

function asHttpError(error: unknown): UnknownHttpError {
  if (typeof error === 'object' && error !== null) {
    return error as UnknownHttpError;
  }

  return {};
}

export const handleError = ({ code, error, set, correlationId }: HandleErrorParams) => {
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
