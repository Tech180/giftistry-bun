import { DomainError } from '@/common/domain/errors/domain-error';
import type {
  ValidateVisibilityPayloadInput,
  ValidatedVisibilityPayload,
} from '../interfaces/validate-visibility-payload-input.interface';

export function validateVisibilityPayload(
  input: ValidateVisibilityPayloadInput
): ValidatedVisibilityPayload {
  const { isOwner, isOwnerVisible, visibleToUserIds, allowedParticipantIds } = input;

  if (isOwner && !isOwnerVisible) {
    throw new DomainError(
      'Forbidden: List owner cannot post non-owner-visible comments on their own list',
      'FORBIDDEN'
    );
  }

  if (!visibleToUserIds || visibleToUserIds.length === 0) {
    return {
      isOwnerVisible: isOwner ? true : isOwnerVisible,
      visibleToUserIds: null,
    };
  }

  const unique = [...new Set(visibleToUserIds.filter(Boolean))];
  for (const userId of unique) {
    if (!allowedParticipantIds.has(userId)) {
      throw new DomainError(
        'One or more selected users do not have access to this wishlist',
        'BAD_REQUEST'
      );
    }
  }

  return {
    isOwnerVisible: true,
    visibleToUserIds: unique,
  };
}
