import type { AcquisitionStrategy } from './acquisition-strategy.interface';
import type { AcquisitionLadderContext } from './acquisition-ladder-context.interface';

export interface RunAcquisitionLadderOptions {
  strategies?: AcquisitionStrategy[];
  context?: AcquisitionLadderContext;
  /** When set, only strategies whose name is listed are executed. */
  onlyStrategyNames?: string[];
}
