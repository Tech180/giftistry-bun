import type { Claim } from '../domain/item.entity';
import type { ClaimItemUseCase } from './claim-item.use-case';
import type { ItemRepository } from '../domain/ports/item.repository';
import type { CreateClaimInput } from '../domain/ports/item.repository';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { resolveItemMetadata } from '../domain/resolve-item-metadata.util';

export interface ClaimWithLinkedInput {
  amount: number | null;
  claimedByName: string | null;
  anonymous: boolean;
  quantity: number;
  selection: string | null;
  includeLinked: boolean;
}

export class ClaimItemWithLinkedUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private claimItem: ClaimItemUseCase,
    private assertItemVisible: AssertItemVisibleUseCase
  ) {}

  async execute(
    itemId: string,
    userId: string,
    input: ClaimWithLinkedInput
  ): Promise<Claim[]> {
    await this.assertItemVisible.execute(itemId, userId);

    const primary = await this.itemRepo.findById(itemId);
    if (!primary) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const prepared: CreateClaimInput[] = [
      await this.claimItem.prepare(
        itemId,
        userId,
        input.amount,
        input.claimedByName,
        input.anonymous,
        input.quantity,
        input.selection
      ),
    ];

    if (input.includeLinked) {
      const metadata = resolveItemMetadata(primary);
      const linkedIds = metadata?.LinkedItemIds ?? primary.LinkedItemIds ?? [];
      if (linkedIds.length > 0) {
        const wishlistItems = await this.itemRepo.findByListId(primary.ListId);

        for (const linkedId of linkedIds) {
          if (linkedId === itemId) continue;
          const linked = wishlistItems.find((item) => item.Id === linkedId);
          if (!linked) continue;

          const existingClaims = await this.itemRepo.findClaimsByItemId(linkedId);
          if (existingClaims.length > 0) continue;

          prepared.push(
            await this.claimItem.prepare(
              linkedId,
              userId,
              null,
              input.claimedByName,
              input.anonymous,
              1,
              null
            )
          );
        }
      }
    }

    return await this.itemRepo.createClaimsAtomic(prepared);
  }
}
