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
  .post('/wishlists/:listId/comments', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry: { Comments: { content, commenterName, isOwnerVisible, isRollover, parentId, imageUrl } } } }) => {
    const { role } = await checkListAccess('viewer');
    const user = await getAuthUser();
    
    const resolvedOwnerVisible = isOwnerVisible ?? true;
    if (role === 'owner' && !resolvedOwnerVisible) {
      throw new AppError('Forbidden: List owner cannot post non-owner-visible comments on their own list', 403, 'FORBIDDEN');
    }

    if (imageUrl) {
      if (!imageUrl.startsWith('data:')) {
        throw new AppError('Invalid image format. Must be a base64 Data URL.', 400, 'BAD_REQUEST');
      }
      const matches = imageUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
      if (!matches) {
        throw new AppError('Invalid base64 Data URL encoding.', 400, 'BAD_REQUEST');
      }
      const mimeType = matches[1];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        throw new AppError(`Invalid image format: ${mimeType}. Allowed formats: JPEG, PNG, GIF, WEBP.`, 400, 'BAD_REQUEST');
      }
      const base64Data = matches[2];
      const estimatedSize = base64Data.length * 0.75;
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (estimatedSize > maxSize) {
        throw new AppError('Image size exceeds the 10MB limit.', 400, 'BAD_REQUEST');
      }
    }

    const resolvedCommenterName = commenterName?.trim() || user.Username;
    
    const comment = await useCases.addComment.execute(
      listId,
      user.userId,
      resolvedCommenterName,
      content,
      resolvedOwnerVisible,
      isRollover ?? false,
      parentId || null,
      imageUrl || null
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
          parentId: t.Optional(t.Nullable(t.String())),
          imageUrl: t.Optional(t.Nullable(t.String())),
        })
      })
    })
  })
  .post('/comments/:commentId/react', async ({ getAuthUser, params: { commentId }, body: { Giftistry: { Comments: { reaction } } } }) => {
    const user = await getAuthUser();
    const result = await useCases.toggleReaction.execute(commentId, user.userId, user.Username, reaction);
    return { success: true, data: result };
  }, {
    detail: {
      tags: ['Comments'],
      summary: 'Toggle emoji/gif reaction on a comment',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Comments: t.Object({
          reaction: t.String(),
        })
      })
    })
  })
  .delete('/wishlists/:listId/comments/:commentId', async ({ getAuthUser, checkListAccess, params: { listId, commentId } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();

    const deleted = await useCases.deleteComment.execute(commentId, user.userId);
    if (!deleted) {
      throw new AppError('Comment not found or you do not have permission to delete it', 403, 'FORBIDDEN');
    }
    return { success: true };
  }, {
    detail: {
      tags: ['Comments'],
      summary: 'Delete own comment',
      description: 'Delete a comment. Only the comment author can delete their own comments.',
      security: [{ bearerAuth: [] }]
    }
  });
