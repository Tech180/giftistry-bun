import type { PageType } from '../../../domain/types/page-type.type';
import type { QualityGateOutcome } from '../types/quality-gate-outcome.type';
import type { QualityGateReason } from '../types/quality-gate-reason.type';

export interface QualityGateResult {
  outcome: QualityGateOutcome;
  reason: QualityGateReason;
  pageType: PageType;
}
