export type ListRole = 'owner' | 'collaborator' | 'viewer';
export type ShareRole = 'collaborator' | 'viewer';
export type GrantedVia = 'direct' | 'link' | 'email' | 'bulk';

export interface ListShare {
  Id: string;
  ListId: string;
  UserId: string;
  Role: ShareRole;
  GrantedVia?: GrantedVia;
  CreatedAt?: Date;
}

export interface ListShareWithUser extends ListShare {
  Username: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Avatar: string | null;
}
