import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import type { CommentUseCases } from './comment-use-cases.interface';

export const commentRoutes = (
  useCases: CommentUseCases,
  middleware: RouteMiddleware
) => new Elysia({ prefix: '/api' })
  .use(middleware.auth)
  .use(middleware.listAccess)
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
  .post('/wishlists/:listId/comments', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry: { Comments: { Content, CommenterName, IsOwnerVisible, IsRollover, ParentId, ImageUrl } } } }) => {
    const { role } = await checkListAccess('viewer');
    const user = await getAuthUser();
    
    const resolvedOwnerVisible = IsOwnerVisible ?? true;
    if (role === 'owner' && !resolvedOwnerVisible) {
      throw new AppError('Forbidden: List owner cannot post non-owner-visible comments on their own list', 403, 'FORBIDDEN');
    }

    if (ImageUrl) {
      if (!ImageUrl.startsWith('data:')) {
        throw new AppError('Invalid image format. Must be a base64 Data URL.', 400, 'BAD_REQUEST');
      }
      const matches = ImageUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
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

    const resolvedCommenterName = CommenterName?.trim() || user.Username;
    
    const comment = await useCases.addComment.execute(
      listId,
      user.userId,
      resolvedCommenterName,
      Content,
      resolvedOwnerVisible,
      IsRollover ?? false,
      ParentId || null,
      ImageUrl || null
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
          Content: t.String(),
          CommenterName: t.Optional(t.Nullable(t.String())),
          IsOwnerVisible: t.Optional(t.Boolean()),
          IsRollover: t.Optional(t.Boolean()),
          ParentId: t.Optional(t.Nullable(t.String())),
          ImageUrl: t.Optional(t.Nullable(t.String())),
        })
      })
    })
  })
  .post('/comments/:commentId/react', async ({ getAuthUser, params: { commentId }, body: { Giftistry: { Comments: { Reaction } } } }) => {
    const user = await getAuthUser();
    const result = await useCases.toggleReaction.execute(commentId, user.userId, user.Username, Reaction);
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
          Reaction: t.String(),
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
