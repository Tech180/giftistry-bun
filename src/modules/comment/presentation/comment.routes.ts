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
  }, {
    detail: {
      tags: ['Comments'],
      summary: 'Get comments on wishlist',
      description: 'Fetch all comments on a wishlist. Hidden comments are filtered out if request is from list owner.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists/:listId/comments', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry: { Comments: { content, commenterName, isOwnerVisible, isRollover } } } }) => {
    const { role } = await checkListAccess('viewer');
    const user = await getAuthUser();
    
    const resolvedOwnerVisible = isOwnerVisible ?? true;
    if (role === 'owner' && !resolvedOwnerVisible) {
      throw new AppError('Forbidden: List owner cannot post non-owner-visible comments on their own list', 403, 'FORBIDDEN');
    }

    const resolvedCommenterName = commenterName || user.email.split('@')[0];
    
    const comment = await useCases.addComment.execute(
      listId,
      user.userId,
      resolvedCommenterName,
      content,
      resolvedOwnerVisible,
      isRollover ?? false
    );
    return { success: true, data: comment };
  }, {
    detail: {
      tags: ['Comments'],
      summary: 'Add comment to wishlist',
      description: 'Post a comment on a wishlist. Owners cannot post surprise comments.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Comments: t.Object({
          content: t.String(),
          commenterName: t.Optional(t.Nullable(t.String())),
          isOwnerVisible: t.Optional(t.Boolean()),
          isRollover: t.Optional(t.Boolean()),
        })
      })
    })
  });
