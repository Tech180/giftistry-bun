import { Elysia } from 'elysia';
import { AppError } from '@/common/domain/errors/app-error';
import { COMMENT_IMAGE_MAX_BYTES } from '@/common/utils/constants/image-data-url.constant';
import { assertImageDataUrl } from '@/common/utils/image-data-url.util';
import { COMMENT_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { CommentRoutesDeps } from '../interfaces/comment-routes-deps.interface';
import { addCommentBodySchema } from '../schemas/add-comment-body.schema';
import { mapAddCommentArgs } from '../utils/map-add-comment-args.util';

export const commentsRoutes = ({ useCases, middleware }: CommentRoutesDeps) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .get('/wishlists/:listId/comments', async ({ getAuthUser, checkListAccess, params: { listId } }) => {
      await checkListAccess('viewer');
      const user = await getAuthUser();
      const comments = await useCases.listComments.execute(listId, user.userId);
      return { success: true, data: comments };
    }, {
      detail: {
        ...COMMENT_SWAGGER_DETAIL,
        summary: 'Get comments on wishlist',
        description:
          'Fetch all comments on a wishlist. Hidden comments are filtered out if request is from list owner.',
      },
    })
    .post(
      '/wishlists/:listId/comments',
      async ({
        getAuthUser,
        checkListAccess,
        params: { listId },
        body: { Giftistry: { Comments: payload } },
      }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();

        if (payload.ImageUrl) {
          assertImageDataUrl(payload.ImageUrl, { maxBytes: COMMENT_IMAGE_MAX_BYTES });
        }

        const args = mapAddCommentArgs(listId, user.userId, user.Username, payload);
        const comment = await useCases.addComment.execute(
          args.listId,
          args.userId,
          args.commenterName,
          args.content,
          args.isOwnerVisible,
          args.isRollover,
          args.parentId,
          args.imageUrl,
          args.visibleToUserIds
        );
        return { success: true, data: comment };
      },
      {
        detail: {
          ...COMMENT_SWAGGER_DETAIL,
          summary: 'Add comment to wishlist',
          description:
            'Post a comment on a wishlist. Owners cannot post surprise comments. Optional VisibleToUserIds restricts audience.',
        },
        body: addCommentBodySchema,
      }
    )
    .delete(
      '/wishlists/:listId/comments/:commentId',
      async ({ getAuthUser, checkListAccess, params: { commentId } }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();

        const deleted = await useCases.deleteComment.execute(commentId, user.userId);
        if (!deleted) {
          throw new AppError(
            'Comment not found or you do not have permission to delete it',
            403,
            'FORBIDDEN'
          );
        }
        return { success: true };
      },
      {
        detail: {
          ...COMMENT_SWAGGER_DETAIL,
          summary: 'Delete own comment',
          description: 'Delete a comment. Only the comment author can delete their own comments.',
        },
      }
    );
