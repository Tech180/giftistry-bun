import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class SignupUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(username: string, email: string, password: string, firstName?: string, lastName?: string): Promise<Omit<User, 'AuthHash'>> {
    if (!username || !email || !password) {
      throw new AppError('Username, email, and password are required', 400, 'BAD_REQUEST');
    }

    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) {
      throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
    }

    const existingUsername = await this.userRepo.findByUsername(username);
    if (existingUsername) {
      throw new AppError('User with this username already exists', 409, 'USER_EXISTS');
    }

    const userCount = await this.userRepo.count();
    const isAdmin = userCount === 0;

    const authHash = await Bun.password.hash(password);
    const user = await this.userRepo.create(username, email, firstName || '', lastName || '', authHash, isAdmin);

    return {
      Id: user.Id,
      Username: user.Username,
      Email: user.Email,
      FirstName: user.FirstName,
      LastName: user.LastName,
      CreatedAt: user.CreatedAt,
      Bio: user.Bio,
      Theme: user.Theme,
      Avatar: user.Avatar,
      EmailVerified: user.EmailVerified,
      TwoFactorEnabled: user.TwoFactorEnabled,
      IsAdmin: user.IsAdmin,
    };
  }
}
