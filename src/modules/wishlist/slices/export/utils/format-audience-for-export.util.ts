import type { ExportAudienceUser } from '../interfaces/export-audience-user.interface';

export function getAudienceDisplayName(user: ExportAudienceUser): string {
  const first = user.FirstName?.trim();
  const last = user.LastName?.trim();
  if (first || last) {
    return `${first || ''} ${last || ''}`.trim();
  }
  return user.Username || user.Email || 'User';
}

export function formatAudienceForExport(
  sharedWith: ExportAudienceUser[] | undefined,
  currentUserId?: string,
  suggestedByUserId?: string | null
): string {
  if (!sharedWith?.length) {
    return 'Everyone';
  }

  if (sharedWith.length === 1) {
    const onlyShare = sharedWith[0];
    if (
      onlyShare &&
      currentUserId &&
      suggestedByUserId &&
      onlyShare.UserId === suggestedByUserId &&
      currentUserId === suggestedByUserId
    ) {
      return 'Only Me';
    }
  }

  return sharedWith.map(getAudienceDisplayName).join(', ');
}
