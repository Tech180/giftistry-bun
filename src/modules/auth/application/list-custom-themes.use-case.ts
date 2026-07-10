import type { UserRepository } from '../domain/ports/user.repository';
import type { CustomTheme } from '../domain/ports/user.repository';

export class ListCustomThemesUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string): Promise<CustomTheme[]> {
    return this.userRepo.listCustomThemes(userId);
  }
}
