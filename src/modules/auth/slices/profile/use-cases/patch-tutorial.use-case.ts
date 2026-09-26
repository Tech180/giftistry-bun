import type { UserRepository } from '../../../domain/ports/user.repository';
import { toSafeUser } from '../../../domain/utils/to-safe-user.util';
import { EMPTY_TOUR_STATE } from '../../../domain/constants/empty-tour-state.constant';
import type { TourChapterId } from '../../../domain/interfaces/tour-chapter-id.type';
import type { TourState } from '../../../domain/interfaces/tour-state.interface';
import { isTourChapterId } from '../../../domain/utils/is-tour-chapter-id.util';
import { AppError } from '@/common/domain/errors/app-error';
import type { PatchTutorialPayload } from '../interfaces/patch-tutorial-payload.interface';
import type { PatchTutorialResult } from '../interfaces/patch-tutorial-result.interface';

export class PatchTutorialUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, payload: PatchTutorialPayload): Promise<PatchTutorialResult> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    let next: TourState = user.Tour
      ? { FirstRunDismissed: user.Tour.FirstRunDismissed, Chapters: { ...user.Tour.Chapters } }
      : { ...EMPTY_TOUR_STATE, Chapters: {} };

    if (payload.ResetAll === true) {
      next = { ...EMPTY_TOUR_STATE, Chapters: {} };
    }

    if (payload.FirstRunDismissed !== undefined) {
      next.FirstRunDismissed = payload.FirstRunDismissed === true;
    }

    if (payload.CompleteChapter !== undefined) {
      next.Chapters[requireChapterId(payload.CompleteChapter)] = 'completed';
    }

    if (payload.SkipChapter !== undefined) {
      next.Chapters[requireChapterId(payload.SkipChapter)] = 'skipped';
    }

    if (payload.ResetChapter !== undefined) {
      const chapterId = requireChapterId(payload.ResetChapter);
      delete next.Chapters[chapterId];
    }

    const updated = await this.userRepo.setTour(userId, next);
    return {
      Tour: updated.Tour ?? next,
      User: toSafeUser(updated),
    };
  }
}

function requireChapterId(value: string): TourChapterId {
  if (!isTourChapterId(value)) {
    throw new AppError(`Invalid tour chapter: ${value}`, 400, 'BAD_REQUEST');
  }

  return value;
}
