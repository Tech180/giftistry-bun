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
