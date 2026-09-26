import type { ListShareRepository } from '@/modules/wishlist';
import { ListRole } from '@/common/domain/list-role.vo';

export async function actorCanManageListItems(
  wishlistOwnerId: string,
  listId: string,
  actorUserId: string,
  listShareRepo?: ListShareRepository
): Promise<boolean> {
  if (wishlistOwnerId === actorUserId) return true;
  if (!listShareRepo) return false;
  const role = await listShareRepo.getRole(listId, actorUserId);
  return !!role && ListRole.create(role).isAtLeast('collaborator');
}
