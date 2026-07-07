import { UserRepository } from '../domain/ports/user.repository';
import { sql } from '@/common/database/connection';

export class UserPreviewUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, viewerId?: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) return null;

    if (user.IsDisabled) {
      return {
        Id: user.Id,
        Username: user.Username,
        FirstName: user.FirstName,
        LastName: user.LastName,
        Avatar: user.Avatar || null,
        IsDisabled: true,
      };
    }

    const [listsCountRow] = await sql<any[]>`
      SELECT 
        COUNT(CASE WHEN is_active = true THEN 1 END)::integer as active_count,
        COUNT(CASE WHEN is_active = false THEN 1 END)::integer as archived_count
      FROM lists 
      WHERE user_id = ${userId}
    `;
    const activeListsCount = listsCountRow?.active_count || 0;
    const archivedListsCount = listsCountRow?.archived_count || 0;

    let mutualsCount = 0;
    if (viewerId && viewerId !== userId) {
      const [mutualsCountRow] = await sql<any[]>`
        SELECT COUNT(*)::integer as count
        FROM (
          SELECT CASE WHEN f1.user_a_id = ${viewerId} THEN f1.user_b_id ELSE f1.user_a_id END as friend_id
          FROM friends f1
          WHERE f1.user_a_id = ${viewerId} OR f1.user_b_id = ${viewerId}
        ) fa
        JOIN (
          SELECT CASE WHEN f2.user_a_id = ${userId} THEN f2.user_b_id ELSE f2.user_a_id END as friend_id
          FROM friends f2
          WHERE f2.user_a_id = ${userId} OR f2.user_b_id = ${userId}
        ) fb ON fa.friend_id = fb.friend_id
      `;
      mutualsCount = mutualsCountRow?.count || 0;
    }

    return {
      Id: user.Id,
      Username: user.Username,
      FirstName: user.FirstName,
      LastName: user.LastName,
      Bio: user.Bio || '',
      Theme: user.Theme || 'default',
      Avatar: user.Avatar || null,
      Birthday: user.Birthday || null,
      WishlistCount: activeListsCount,
      ActiveListsCount: activeListsCount,
      ArchivedListsCount: archivedListsCount,
      MutualsCount: mutualsCount,
      CreatedAt: user.CreatedAt,
      LastOnline: user.LastOnline || null,
    };
  }
}
