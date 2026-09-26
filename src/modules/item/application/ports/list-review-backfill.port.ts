import type { BackfillListReviewsUseCase } from '../../slices/metadata/use-cases/backfill-list-reviews.use-case';

/** Published contract: backfill AI reviews for a list. */
export type ListReviewBackfillPort = Pick<BackfillListReviewsUseCase, 'execute'>;
