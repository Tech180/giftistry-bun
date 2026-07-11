import { AppError } from '@/common/middlewares/error.middleware';
import { loadConfig } from '@/common/infrastructure/config.loader';
import { ownerPolicyAllowsAiExtraction } from '@/common/application/user-ai-access.util';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { DescriptionSummarizer } from '../domain/ports/description-summarizer.port';
import { formatItemContextBlock } from '../infrastructure/gemini-description-summarizer';

export interface SummarizeItemDescriptionInput {
  listId: string;
  name: string;
  text?: string;
  linkUrl?: string;
  websiteName?: string;
  price?: number | null;
  category?: string;
  priority?: number | null;
  customFields?: {
    Predefined?: Record<string, string | null>;
    UserDefined?: Record<string, string>;
  };
  variations?: { Name: string; Quantity: number }[];
  desiredQuantity?: number;
}

export class SummarizeItemDescriptionUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private userRepo: UserRepository,
    private assertUserCan: AssertUserCanUseCase,
    private descriptionSummarizer: DescriptionSummarizer
  ) {}

  async execute(userId: string, input: SummarizeItemDescriptionInput): Promise<string> {
    const config = loadConfig();
    if (!config.aiEnabled) {
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

    await this.assertUserCan.execute(userId, 'canUseAiFeatures');

    const ownerAllowsAi = await ownerPolicyAllowsAiExtraction(
      wishlist.UserId,
      this.userRepo,
      this.assertUserCan
    );
    if (!ownerAllowsAi) {
      throw new AppError('AI features are not permitted for this wishlist owner', 403, 'FORBIDDEN');
    }

    const provider = config.aiProvider || 'gemini';
    const apiKey = config.aiApiKey || Bun.env.GEMINI_API_KEY || '';
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
        model: config.aiModel || '',
        customPrompt: config.aiDescriptionPrompt || '',
        endpoint: config.aiEndpoint || '',
      }
    );
  }
}
