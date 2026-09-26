import type { User } from '../interfaces/user.interface';
import type { SafeUser } from '../types/safe-user.type';

export function toSafeUser(user: User): SafeUser {
  const { AuthHash: _authHash, ...safeUser } = user;
  return safeUser;
}
