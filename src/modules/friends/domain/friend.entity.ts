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
