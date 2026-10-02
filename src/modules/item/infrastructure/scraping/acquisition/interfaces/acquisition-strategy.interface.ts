import type { FetchOutcome } from '../../../../domain/types/fetch-outcome.type';
import type { AcquisitionLadderContext } from './acquisition-ladder-context.interface';

export interface AcquisitionStrategy {
  readonly name: string;
  canHandle(url: string, context?: AcquisitionLadderContext): boolean;
  fetch(url: string, context?: AcquisitionLadderContext): Promise<FetchOutcome>;
}
