import { Elysia } from 'elysia';
import { COMMENT_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { CommentRoutesDeps } from '../interfaces/comment-routes-deps.interface';
import { toggleReactionBodySchema } from '../schemas/toggle-reaction-body.schema';

export const reactionsRoutes = ({ useCases, middleware }: CommentRoutesDeps) =>
  new Elysia()
    .use(middleware.auth)
    .post(
      '/comments/:commentId/react',
      async ({ getAuthUser, params: { commentId }, body: { Giftistry: { Comments: { Reaction } } } }) => {
        const user = await getAuthUser();
        const result = await useCases.toggleReaction.execute(
          commentId,
          user.userId,
          user.Username,
          Reaction
        );
        return { success: true, data: result };
      },
      {
        detail: {
          ...COMMENT_SWAGGER_DETAIL,
          summary: 'Toggle emoji/gif reaction on a comment',
        },
        body: toggleReactionBodySchema,
      }
    );
