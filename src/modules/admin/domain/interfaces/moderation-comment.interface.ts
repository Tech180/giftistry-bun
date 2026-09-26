export interface ModerationComment {
  Id: string;
  Content: string;
  CommenterName: string;
  IsDeleted: boolean;
  CreatedAt: Date | string;
  ListTitle: string;
  ListId: string;
  Username: string | null;
}
