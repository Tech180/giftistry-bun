/** Public barrel for the comment module. Prefer this over deep imports. */
export type { Comment } from './domain/interfaces/comment.interface';
export type { CommentReaction } from './domain/interfaces/comment-reaction.interface';
export { CommentEntity } from './domain/comment.entity';
export type { CommentRepository } from './domain/ports/comment.repository';
export type { CommentRealtimePublisher } from './domain/ports/comment-realtime-publisher.port';
export type { CommentRealtimeEventType } from './domain/types/comment-realtime-event-type.type';
export type { UseCases as CommentUseCases } from './presentation/interfaces/use-cases.interface';
export type { CommentModuleDeps } from './interfaces/comment-module-deps.interface';
export { createCommentModule } from './comment.module';
