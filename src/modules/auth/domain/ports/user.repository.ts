import type { User } from '../user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(username: string, email: string, firstName: string, lastName: string, authHash: string): Promise<User>;
  update(id: string, updates: { username?: string; firstName?: string; lastName?: string; bio?: string; theme?: string; avatar?: string | null }): Promise<User>;
}
