import type { User } from '../interfaces/user.interface';

export type SafeUser = Omit<User, 'AuthHash'>;
