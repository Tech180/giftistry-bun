export type ListRole = 'owner' | 'collaborator' | 'viewer';

export interface ListShare {
  Id: string;
  ListId: string;
  UserId: string;
  Role: 'collaborator' | 'viewer';
  CreatedAt?: Date;
}
