import type { UserRepository } from '../domain/ports/user.repository';
import type { EmailSender } from '../domain/ports/email-sender.port';

export class ResendVerificationUseCase {
  constructor(
    private userRepo: UserRepository,
    private emailSender: EmailSender
  ) {}

  async execute(userId: string, email: string, username: string): Promise<void> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userRepo.update(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: expiresAt,
    });

    await this.emailSender.sendVerificationEmail(email, username, token);
  }
}
