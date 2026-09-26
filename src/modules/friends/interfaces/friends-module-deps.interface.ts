import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { EventBus } from '@/common/domain/ports/event-bus.port';
import type { UserRepository } from '@/modules/auth';
import type { FriendRepository } from '../domain/ports/friend.repository';
import type { FriendRequestRepository } from '../domain/ports/friend-request.repository';

export interface FriendsModuleDeps {
  friendRepo: FriendRepository;
  friendRequestRepo: FriendRequestRepository;
  userRepo: UserRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
  eventBus: EventBus;
}
