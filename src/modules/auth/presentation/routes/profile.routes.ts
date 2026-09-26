import { Elysia } from 'elysia';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { createOwnerAuthMiddleware } from '../middlewares/owner-auth.middleware';
import { onboardingBodySchema } from '../schemas/onboarding-body.schema';
import { tutorialBodySchema } from '../schemas/tutorial-body.schema';
import { updateProfileBodySchema } from '../schemas/update-profile-body.schema';
import { assertProfileAvatar } from '../utils/assert-profile-avatar.util';
import {
  mapCompleteOwnerOnboardingPayload,
  mapOnboardingProfilePayload,
  mapPatchTutorialPayload,
} from '../utils/map-onboarding-payload.util';
import { mapUpdateProfilePayload } from '../utils/map-update-profile-payload.util';
import { withPasskeyFlag } from '../utils/with-passkey-flag.util';

export const profileRoutes = ({ useCases, userRepo }: AuthRoutesDeps) =>
  new Elysia()
    .use(createOwnerAuthMiddleware(userRepo))
    .get('/onboarding', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const state = await useCases.getOnboardingState.execute(authUser.userId);
      return { success: true, ...state };
    })
    .patch('/onboarding', async ({ getAuthUser, getOwnerUser, body: { Giftistry: { Onboarding } } }) => {
      const authUser = await getAuthUser();
      const payload = Onboarding ?? {};

      if (payload.Username || payload.FirstName || payload.LastName || payload.Theme || payload.Bio) {
        await useCases.updateProfile.execute(authUser.userId, mapOnboardingProfilePayload(payload));
      }

      if (payload.CompleteOwner) {
        await getOwnerUser();
        await useCases.completeOwnerOnboarding.execute(
          authUser.userId,
          mapCompleteOwnerOnboardingPayload(payload)
        );
      }

      let user = null;
      if (payload.CompleteUser) {
        user = await useCases.completeUserOnboarding.execute(authUser.userId);
      }

      const state = await useCases.getOnboardingState.execute(authUser.userId);
      return {
        success: true,
        ...state,
        ...(user ? { User: user } : {}),
      };
    }, {
      body: onboardingBodySchema,
    })
    .patch('/tutorial', async ({ getAuthUser, body: { Giftistry: { Tutorial } } }) => {
      const authUser = await getAuthUser();
      const payload = Tutorial ?? {};
      const result = await useCases.patchTutorial.execute(
        authUser.userId,
        mapPatchTutorialPayload(payload)
      );
      return {
        success: true,
        Tour: result.Tour,
        User: result.User,
      };
    }, {
      body: tutorialBodySchema,
      detail: {
        tags: ['Authentication'],
        summary: 'Update product tour progress',
        description: 'Merge-patches tutorial chapter completion, skip, reset, and first-run dismissal.',
        security: [{ bearerAuth: [] }],
      },
    })
    .put('/profile', async ({ getAuthUser, body: { Giftistry: { Auth: profile } } }) => {
      const authUser = await getAuthUser();
      assertProfileAvatar(profile.Avatar);

      const user = await useCases.updateProfile.execute(
        authUser.userId,
        mapUpdateProfilePayload(profile)
      );
      const userWithPasskey = await withPasskeyFlag(useCases, user);
      return { success: true, User: userWithPasskey };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Update user profile details',
        description: 'Updates username, first name, last name, bio, theme, or avatar of the active user profile.',
        security: [{ bearerAuth: [] }],
      },
      body: updateProfileBodySchema,
    });
