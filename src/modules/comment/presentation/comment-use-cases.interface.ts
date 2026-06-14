import type { AddCommentUseCase } from '../application/add-comment.use-case';
import type { ListCommentsUseCase } from '../application/list-comments.use-case';

export interface CommentUseCases {
  addComment: AddCommentUseCase;
  listComments: ListCommentsUseCase;
}
