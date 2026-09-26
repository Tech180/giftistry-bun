import type { CommentRealtimeEventType } from '../types/comment-realtime-event-type.type';

export interface CommentRealtimePublisher {
  publish(
    listId: string,
    type: CommentRealtimeEventType,
    data: Record<string, unknown>
  ): void;
}
