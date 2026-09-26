import { AppError } from '@/common/domain/errors/app-error';
import type { ServerConfigRepository } from '@/modules/system';
import { resolveAiConnection } from '@/common/utils/resolve-ai-connection.util';
import { ownerPolicyAllowsAiExtraction } from '@/common/application/utils/user-ai-access.util';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth';
import type { WishlistRepository } from '@/modules/wishlist';
import type { DescriptionSummarizer } from '../../../domain/ports/description-summarizer.port';
import { formatItemContextBlock } from '../../../domain/utils/format-item-context-block.util';
import type { SummarizeItemDescriptionInput } from '../interfaces/summarize-item-description-input.interface';

export class SummarizeItemDescriptionUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private userRepo: UserRepository,
    private assertUserCan: AssertUserCanUseCase,
    private descriptionSummarizer: DescriptionSummarizer,
    private configRepo: ServerConfigRepository
  ) {}

  async execute(userId: string, input: SummarizeItemDescriptionInput): Promise<string> {
    const config = this.configRepo.load();
    if (!config.AiEnabled) {
      throw new AppError('AI features are disabled on this server', 403, 'FORBIDDEN');
    }

    const wishlist = await this.wishlistRepo.findById(input.listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    if (!wishlist.AiEnabled) {
      throw new AppError('AI features are disabled for this wishlist', 403, 'FORBIDDEN');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    if (user.AiEnabled === false) {
      throw new AppError('AI features are disabled on your profile', 403, 'FORBIDDEN');
    }

    await this.assertUserCan.execute(userId, 'CanUseAiFeatures');

    const ownerAllowsAi = await ownerPolicyAllowsAiExtraction(
      wishlist.UserId,
      this.userRepo,
      this.assertUserCan
    );
    if (!ownerAllowsAi) {
      throw new AppError('AI features are not permitted for this wishlist owner', 403, 'FORBIDDEN');
    }

    const { provider, apiKey, model, endpoint } = resolveAiConnection(config, 'fast');
    if (provider !== 'local' && !apiKey) {
      throw new AppError('AI provider is not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    const itemContext = formatItemContextBlock({
      priority: input.priority,
      customFields: input.customFields,
      variations: input.variations,
      desiredQuantity: input.desiredQuantity,
    });

    return this.descriptionSummarizer.summarize(
      {
        itemName: input.name,
        category: input.category,
        url: input.linkUrl,
        price: input.price,
        websiteName: input.websiteName,
        existingNotes: input.text,
        itemContext,
      },
      {
        provider,
        apiKey,
        model,
        customPrompt: config.AiDescriptionPrompt || '',
        endpoint,
      }
    );
  }
}
