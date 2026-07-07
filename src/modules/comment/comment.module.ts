import { Elysia } from 'elysia';
import { PostgresCommentRepository } from './infrastructure/postgres-comment.repository';
import { sharedPostgresWishlistRepository } from '@/modules/wishlist/wishlist.module';
import { AddCommentUseCase } from './application/add-comment.use-case';
import { ListCommentsUseCase } from './application/list-comments.use-case';
import { DeleteCommentUseCase } from './application/delete-comment.use-case';
import { ToggleReactionUseCase } from './application/toggle-reaction.use-case';
import { commentRoutes } from './presentation/comment.routes';

const commentRepo = new PostgresCommentRepository();

const addCommentUseCase = new AddCommentUseCase(commentRepo, sharedPostgresWishlistRepository);
const listCommentsUseCase = new ListCommentsUseCase(commentRepo, sharedPostgresWishlistRepository);
const deleteCommentUseCase = new DeleteCommentUseCase(commentRepo);
const toggleReactionUseCase = new ToggleReactionUseCase(commentRepo);

export const commentModule = new Elysia()
  .use(commentRoutes({
    addComment: addCommentUseCase,
    listComments: listCommentsUseCase,
    deleteComment: deleteCommentUseCase,
    toggleReaction: toggleReactionUseCase,
  }));
