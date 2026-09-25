import type { UserRepository } from '../domain/ports/user.repository';
import type { SafeUser } from '../domain/user.entity';
import { toSafeUser } from '../domain/user.entity';
import {
  EMPTY_TOUR_STATE,
  isTourChapterId,
  type TourChapterId,
  type TourState,
} from '../domain/tour.state';
import { AppError } from '@/common/middlewares/error.middleware';

export interface PatchTutorialPayload {
  FirstRunDismissed?: boolean;
  CompleteChapter?: string;
  SkipChapter?: string;
  ResetChapter?: string;
  ResetAll?: boolean;
}

export interface PatchTutorialResult {
  Tour: TourState;
  User: SafeUser;
}

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
