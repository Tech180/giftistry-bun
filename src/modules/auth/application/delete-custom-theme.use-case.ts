import type { UserRepository } from '../domain/ports/user.repository';

export class DeleteCustomThemeUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, themeId: string): Promise<void> {
    await this.userRepo.deleteCustomTheme(userId, themeId);
  }
}
