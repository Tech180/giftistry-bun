import type { ImportAudiencePerson } from '../interfaces/import-audience-person.interface';
import type { ResolveImportAudienceResult } from '../interfaces/resolve-import-audience-result.interface';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveImportAudienceUserIds(params: {
  audienceLabel: string | undefined;
  currentUserId: string;
  people: ImportAudiencePerson[];
}): ResolveImportAudienceResult {
  const label = params.audienceLabel?.trim() || '';
  if (!label || normalize(label) === 'everyone') {
    return { userIds: [], warnings: [] };
  }
  if (normalize(label) === 'only me') {
    return { userIds: [params.currentUserId], warnings: [] };
  }

  const userIds: string[] = [];
  const warnings: string[] = [];
  for (const part of label.split(',').map((entry) => entry.trim()).filter(Boolean)) {
    const matches = params.people.filter((person) => normalize(person.displayName) === normalize(part));
    if (matches.length === 1 && matches[0]) {
      userIds.push(matches[0].userId);
      continue;
    }
    warnings.push(`Could not match audience "${part}" to a list member.`);
  }
  return { userIds: [...new Set(userIds)], warnings };
}
