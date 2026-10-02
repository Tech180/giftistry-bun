import type { PopulateJsonFailureKind } from '../types/populate-json-failure-kind.type';

export class PopulateJsonValidationError extends Error {
  readonly kind: PopulateJsonFailureKind;
  readonly rawLength?: number;

  constructor(message: string, details: { kind?: PopulateJsonFailureKind; rawLength?: number } = {}) {
    super(message);
    this.name = 'PopulateJsonValidationError';
    this.kind = details.kind ?? 'schema';
    this.rawLength = details.rawLength;
  }
}
