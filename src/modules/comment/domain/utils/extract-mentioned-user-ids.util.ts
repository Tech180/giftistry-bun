import { USER_MENTION_REGEX } from '../constants/user-mention-regex.constant';

export function extractMentionedUserIds(content: string): string[] {
  const ids: string[] = [];
  for (const match of content.matchAll(USER_MENTION_REGEX)) {
    const id = match[2];
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}
