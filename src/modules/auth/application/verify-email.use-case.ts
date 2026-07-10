import type { UserRepository } from '../domain/ports/user.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class VerifyEmailUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(token: string): Promise<void> {
    const userRow = await this.userRepo.findByEmailVerificationToken(token);
    if (!userRow) {
      throw new AppError('Invalid verification token', 400, 'BAD_REQUEST');
    }

    if (userRow.emailVerificationExpires < new Date()) {
      throw new AppError('Verification token has expired', 400, 'BAD_REQUEST');
    }

    await this.userRepo.update(userRow.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
  }
}
