import type { UnknownHttpError } from '../interfaces/unknown-http-error.interface';

export function asHttpError(error: unknown): UnknownHttpError {
  if (typeof error === 'object' && error !== null) {
    return error as UnknownHttpError;
  }

  return {};
}
