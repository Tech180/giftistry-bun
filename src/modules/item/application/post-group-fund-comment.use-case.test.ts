import { describe, expect, mock, test } from 'bun:test';
import {
  GROUP_FUND_SYSTEM_COMMENTER_NAME,
  PostGroupFundCommentUseCase,
} from './post-group-fund-comment.use-case';
import type { CommentRepository } from '@/modules/comment/domain/ports/comment.repository';
import type { CommentRealtimePublisher } from '@/modules/comment/domain/ports/comment-realtime-publisher.port';

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

    expect(create).toHaveBeenCalledWith(
      'list-1',
      null,
      GROUP_FUND_SYSTEM_COMMENTER_NAME,
      'Group Funding has been started for Camera and has an initial contribution of $25.00. Join in! [Camera](item:item-1)',
      false,
      false,
      null,
      null
    );
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

    expect(create).toHaveBeenCalledWith(
      'list-1',
      null,
      GROUP_FUND_SYSTEM_COMMENTER_NAME,
      'Group Funding has received a contribution of $10.00 for Camera. Join in! [Camera](item:item-1)',
      false,
      false,
      null,
      null
    );
  });
});
