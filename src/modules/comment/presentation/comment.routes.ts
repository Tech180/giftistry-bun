import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { listAccessMiddleware } from '@/common/middlewares/list-access.middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import type { CommentUseCases } from './comment-use-cases.interface';

export const commentRoutes = (useCases: CommentUseCases) => new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .use(listAccessMiddleware)
  .get('/wishlists/:listId/comments', async ({ getAuthUser, checkListAccess, params: { listId } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    const comments = await useCases.listComments.execute(listId, user.userId);
    return { success: true, data: comments };
  })
  .post('/wishlists/:listId/comments', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry } }) => {
    const { role } = await checkListAccess('viewer');
    const user = await getAuthUser();
    
    const isOwnerVisible = Giftistry.isOwnerVisible ?? true;
    if (role === 'owner' && !isOwnerVisible) {
      throw new AppError('Forbidden: List owner cannot post non-owner-visible comments on their own list', 403, 'FORBIDDEN');
    }

    const commenterName = Giftistry.commenterName || user.email.split('@')[0];
    
    const comment = await useCases.addComment.execute(
      listId,
      user.userId,
      commenterName,
      Giftistry.content,
      isOwnerVisible,
      Giftistry.isRollover ?? false
    );
    return { success: true, data: comment };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        content: t.String(),
        commenterName: t.Optional(t.Nullable(t.String())),
        isOwnerVisible: t.Optional(t.Boolean()),
        isRollover: t.Optional(t.Boolean()),
      })
    })
  });
