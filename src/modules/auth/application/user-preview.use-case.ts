import { UserRepository } from '../domain/ports/user.repository';

export class UserPreviewUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) return null;
    return {
      Id: user.Id,
      Username: user.Username,
      FirstName: user.FirstName,
      LastName: user.LastName,
      Bio: user.Bio || '',
      Theme: user.Theme || 'default',
      Avatar: user.Avatar || null,
      CreatedAt: user.CreatedAt,
    };
  }
}
