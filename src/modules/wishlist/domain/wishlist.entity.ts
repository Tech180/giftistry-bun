export interface Priority {
  Id: string;
  UserId: string;
  Label: string;
  Weight: number;
}

export interface Wishlist {
  Id: string;
  UserId: string;
  Title: string;
  ExpiresAt: Date | null;
  AllowGroupFunds: boolean;
  IsActive: boolean;
  CreatedAt?: Date;
  Category?: string;
  OwnerUsername?: string;
  OwnerFirstName?: string;
  Role?: 'owner' | 'collaborator' | 'viewer';
}
