import type { CheckListAccessUseCase } from '@/modules/wishlist';

/** Wired by createListAccessMiddleware; read by getListAccessContext. */
export const LIST_ACCESS_USE_CASE: { current: CheckListAccessUseCase | null } = {
  current: null,
};
