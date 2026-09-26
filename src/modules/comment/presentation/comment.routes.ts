import { Elysia } from 'elysia';
import type { CommentRoutesDeps } from './interfaces/comment-routes-deps.interface';
import { commentsRoutes } from './routes/comments.routes';
import { reactionsRoutes } from './routes/reactions.routes';

export const commentRoutes = (deps: CommentRoutesDeps) =>
  new Elysia({ prefix: '/api' })
    .use(commentsRoutes(deps))
    .use(reactionsRoutes(deps));
