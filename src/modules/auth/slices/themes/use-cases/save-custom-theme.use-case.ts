import type { CustomTheme } from '../../../domain/interfaces/custom-theme.interface';
import type { CustomThemeInput } from '../../../domain/interfaces/custom-theme-input.interface';
import type { UserRepository } from '../../../domain/ports/user.repository';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';

export class SaveCustomThemeUseCase {
  constructor(
    private userRepo: UserRepository,
    private assertUserCan: AssertUserCanUseCase
  ) {}

  async execute(userId: string, theme: CustomThemeInput): Promise<CustomTheme> {
    await this.assertUserCan.execute(userId, 'CanUseCustomThemes');
    return this.userRepo.saveCustomTheme(userId, theme);
  }
}
