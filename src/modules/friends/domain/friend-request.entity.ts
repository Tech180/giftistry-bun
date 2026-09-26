import { DomainError } from '@/common/domain/errors/domain-error';
import type { FriendRequest } from './interfaces/friend-request.interface';
import type { FriendRequestStatus } from './types/friend-request-status.type';

export class FriendRequestEntity implements FriendRequest {
  Id!: string;
  SenderId!: string;
  ReceiverId!: string;
  Status!: FriendRequestStatus;
  CreatedAt!: Date;
  UpdatedAt!: Date;

  constructor(data: FriendRequest) {
    Object.assign(this, data);
  }

  static from(data: FriendRequest): FriendRequestEntity {
    return new FriendRequestEntity(data);
  }

  toPlain(): FriendRequest {
    return { ...this };
  }

  isPending(): boolean {
    return this.Status === 'pending';
  }

  canBeAcceptedBy(userId: string): void {
    if (this.ReceiverId !== userId) {
      throw new DomainError('Friend request not found', 'NOT_FOUND');
    }
    if (!this.isPending()) {
      throw new DomainError('Friend request is no longer pending', 'BAD_REQUEST');
    }
  }

  canBeDeclinedBy(userId: string): void {
    this.canBeAcceptedBy(userId);
  }

  canBeCancelledBy(userId: string): void {
    if (this.SenderId !== userId) {
      throw new DomainError('Friend request not found', 'NOT_FOUND');
    }
    if (!this.isPending()) {
      throw new DomainError('Friend request is no longer pending', 'BAD_REQUEST');
    }
  }
}
