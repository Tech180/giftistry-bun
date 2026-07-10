import type { PasskeyRepository } from '../domain/ports/passkey.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class DeletePasskeyUseCase {
  constructor(private passkeyRepo: PasskeyRepository) {}

  async execute(userId: string, passkeyId: string): Promise<void> {
    const passkey = await this.passkeyRepo.findById(passkeyId);
    if (!passkey) {
      throw new AppError('Passkey not found', 404, 'NOT_FOUND');
    }
    if (passkey.UserId !== userId) {
      throw new AppError('Unauthorized access to passkey', 403, 'FORBIDDEN');
    }
    await this.passkeyRepo.delete(passkeyId);
  }
}
