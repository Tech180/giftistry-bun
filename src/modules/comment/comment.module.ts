import { Elysia } from 'elysia';
import { PostgresCommentRepository } from './infrastructure/postgres-comment.repository';
import { sharedPostgresWishlistRepository } from '@/modules/wishlist/wishlist.module';
import { AddCommentUseCase } from './application/add-comment.use-case';
import { ListCommentsUseCase } from './application/list-comments.use-case';
import { commentRoutes } from './presentation/comment.routes';

const commentRepo = new PostgresCommentRepository();

const addCommentUseCase = new AddCommentUseCase(commentRepo, sharedPostgresWishlistRepository);
const listCommentsUseCase = new ListCommentsUseCase(commentRepo, sharedPostgresWishlistRepository);

export const commentModule = new Elysia()
  .use(commentRoutes({
    addComment: addCommentUseCase,
    listComments: listCommentsUseCase,
  }));
