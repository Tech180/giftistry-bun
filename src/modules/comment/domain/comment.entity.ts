export interface Comment {
  Id: string;
  ListId: string;
  UserId: string | null;
  CommenterName: string;
  Content: string;
  IsOwnerVisible: boolean;
  IsRollover: boolean;
  CreatedAt?: Date;
}
