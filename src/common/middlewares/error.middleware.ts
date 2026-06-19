export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errorCode: string = 'INTERNAL_SERVER_ERROR',
    public extra?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = ({ code, error, set, correlationId }: any) => {
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

  const statusCode = error.status || error.statusCode || (code === 'NOT_FOUND' ? 404 : 500);
  if (statusCode >= 500) {
    console.error(`[ERROR] [CorrelationId: ${correlationId || 'N/A'}] Unhandled API Error:`, error);
  } else {
    console.warn(`[WARN] [CorrelationId: ${correlationId || 'N/A'}] Client Error (${statusCode}): ${error.message || error}`);
  }
  set.status = statusCode;
  return {
    Status: 'error',
    Code: error.code || code || 'INTERNAL_SERVER_ERROR',
    Message: error.message || 'An unexpected error occurred',
  };
};
