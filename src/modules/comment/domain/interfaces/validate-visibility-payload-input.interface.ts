export interface ValidateVisibilityPayloadInput {
  isOwner: boolean;
  isOwnerVisible: boolean;
  visibleToUserIds: string[] | null | undefined;
  allowedParticipantIds: Set<string>;
}

export interface ValidatedVisibilityPayload {
  isOwnerVisible: boolean;
  visibleToUserIds: string[] | null;
}
