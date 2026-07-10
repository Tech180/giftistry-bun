import { AppError } from '@/common/middlewares/error.middleware';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FriendRequest {
  Id: string;
  SenderId: string;
  ReceiverId: string;
  Status: FriendRequestStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface Friend {
  Id: string;
  UserAId: string;
  UserBId: string;
  CreatedAt: Date;
}

export interface FriendWithUser {
  Id: string;
  UserId: string;
  Username: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Avatar: string | null;
  FriendsSince: Date;
  Birthday?: string | null;
  WishlistCount?: number;
  MutualsCount?: number;
  RecentActivity?: string | null;
  LastOnline?: Date | null;
}

export interface FriendRequestWithUser extends FriendRequest {
  SenderUsername?: string;
  SenderFirstName?: string;
  SenderLastName?: string;
  SenderAvatar?: string | null;
  ReceiverUsername?: string;
  ReceiverFirstName?: string;
  ReceiverLastName?: string;
  ReceiverAvatar?: string | null;
}

export interface UserSearchResult {
  Id: string;
  Username: string;
  FirstName: string;
  LastName: string;
  Avatar: string | null;
}

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
      throw new AppError('Friend request not found', 404, 'NOT_FOUND');
    }
    if (!this.isPending()) {
      throw new AppError('Friend request is no longer pending', 400, 'BAD_REQUEST');
    }
  }

  canBeDeclinedBy(userId: string): void {
    this.canBeAcceptedBy(userId);
  }

  canBeCancelledBy(userId: string): void {
    if (this.SenderId !== userId) {
      throw new AppError('Friend request not found', 404, 'NOT_FOUND');
    }
    if (!this.isPending()) {
      throw new AppError('Friend request is no longer pending', 400, 'BAD_REQUEST');
    }
  }
}
