import type { FriendRequestRepository } from '../../domain/ports/friend-request.repository';
import type { FriendRequestsResult } from '../interfaces/friend-requests-result.interface';
export type { FriendRequestsResult };

export class ListFriendRequestsUseCase {
  constructor(private friendRequestRepo: FriendRequestRepository) {}

  async execute(userId: string): Promise<FriendRequestsResult> {
    const [incoming, outgoing] = await Promise.all([
      this.friendRequestRepo.listIncoming(userId),
      this.friendRequestRepo.listOutgoing(userId),
    ]);
    return { incoming, outgoing };
  }
}
