import type { SafeUser } from '../../../domain/types/safe-user.type';
import type { TourState } from '../../../domain/interfaces/tour-state.interface';

export interface PatchTutorialResult {
  Tour: TourState;
  User: SafeUser;
}
