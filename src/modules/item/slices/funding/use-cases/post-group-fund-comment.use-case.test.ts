import { describe, expect, mock, test } from 'bun:test';
import { GROUP_FUND_SYSTEM_COMMENTER_NAME } from '../constants/group-fund-system-commenter-name.constant';
import { PostGroupFundCommentUseCase } from './post-group-fund-comment.use-case';
import type { CommentRepository } from '@/modules/comment';
import type { CommentRealtimePublisher } from '@/modules/comment';

function mockCommentRealtime(): CommentRealtimePublisher {
  return { publish: mock(() => {}) };
}

describe('PostGroupFundCommentUseCase', () => {
  test('creates owner-hidden system start comment with item tag', async () => {
    const create = mock(() =>
      Promise.resolve({
        Id: 'c1',
        ListId: 'list-1',
        UserId: null,
        CommenterName: GROUP_FUND_SYSTEM_COMMENTER_NAME,
        Content: 'x',
        IsOwnerVisible: false,
        IsRollover: false,
        IsDeleted: false,
        ParentId: null,
        ImageUrl: null,
        CreatedAt: new Date(),
        Reactions: [],
      })
    );
    const commentRepo = { create } as unknown as CommentRepository;
    const useCase = new PostGroupFundCommentUseCase(commentRepo, mockCommentRealtime());

    await useCase.execute({
      listId: 'list-1',
      itemId: 'item-1',
      itemName: 'Camera',
      amount: 25,
      isStart: true,
    });

    expect(create).toHaveBeenCalledWith({
      listId: 'list-1',
      userId: null,
      commenterName: GROUP_FUND_SYSTEM_COMMENTER_NAME,
      content:
        'Group Funding has been started for Camera and has an initial contribution of $25.00. Join in! [Camera](item:item-1)',
      isOwnerVisible: false,
      isRollover: false,
      parentId: null,
      imageUrl: null,
    });
  });

  test('creates system contribute comment', async () => {
    const create = mock(() =>
      Promise.resolve({
        Id: 'c1',
        ListId: 'list-1',
        UserId: null,
        CommenterName: GROUP_FUND_SYSTEM_COMMENTER_NAME,
        Content: 'x',
        IsOwnerVisible: false,
        IsRollover: false,
        IsDeleted: false,
        ParentId: null,
        ImageUrl: null,
        CreatedAt: new Date(),
        Reactions: [],
      })
    );
    const commentRepo = { create } as unknown as CommentRepository;
    const useCase = new PostGroupFundCommentUseCase(commentRepo, mockCommentRealtime());

    await useCase.execute({
      listId: 'list-1',
      itemId: 'item-1',
      itemName: 'Camera',
      amount: 10,
      isStart: false,
    });

    expect(create).toHaveBeenCalledWith({
      listId: 'list-1',
      userId: null,
      commenterName: GROUP_FUND_SYSTEM_COMMENTER_NAME,
      content:
        'Group Funding has received a contribution of $10.00 for Camera. Join in! [Camera](item:item-1)',
      isOwnerVisible: false,
      isRollover: false,
      parentId: null,
      imageUrl: null,
    });
  });
});
