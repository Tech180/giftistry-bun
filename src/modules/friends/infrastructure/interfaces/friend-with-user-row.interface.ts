export interface FriendWithUserRow {
  Id: string;
  UserId: string;
  Username: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Avatar: string | null;
  FriendsSince: Date | string;
  Birthday: Date | string | null;
  WishlistCount: number | string | null;
  MutualsCount: number | string | null;
  RecentActivity: string | null;
  LastOnline: Date | string | null;
}
