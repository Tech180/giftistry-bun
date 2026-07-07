import type { User } from '../user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(username: string, email: string, firstName: string, lastName: string, authHash: string, isAdmin?: boolean, isOwner?: boolean): Promise<User>;
  update(id: string, updates: { 
    username?: string; 
    firstName?: string; 
    lastName?: string; 
    bio?: string; 
    theme?: string; 
    avatar?: string | null; 
    birthday?: string | null;
    emailVerified?: boolean;
    emailVerificationToken?: string | null;
    emailVerificationExpires?: Date | null;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string | null;
    isAdmin?: boolean;
  }): Promise<User>;
  count(): Promise<number>;
  updateLastOnline(id: string): Promise<void>;
}
