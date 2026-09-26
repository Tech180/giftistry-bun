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
