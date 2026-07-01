import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class LoginUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(email: string, password: string): Promise<Omit<User, 'AuthHash'>> {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    const isMatch = await Bun.password.verify(password, user.AuthHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

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
