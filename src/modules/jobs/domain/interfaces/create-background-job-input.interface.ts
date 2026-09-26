import type { BackgroundJobKind } from './background-job-kind.type';
import type { BackgroundJobPayload } from './background-job-payload.type';

export interface CreateBackgroundJobInput {
  kind: BackgroundJobKind;
  userId: string;
  listId?: string | null;
  payload: BackgroundJobPayload;
}
