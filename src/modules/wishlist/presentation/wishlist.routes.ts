import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import type { WishlistUseCases } from './wishlist-use-cases.interface';
import type { InvitesUseCases } from '@/modules/invites/presentation/invites-use-cases.interface';

export const wishlistRoutes = (
  useCases: WishlistUseCases,
  inviteUseCases: InvitesUseCases | undefined,
  middleware: RouteMiddleware
) => new Elysia({ prefix: '/api' })
  .use(middleware.auth)
  // Get all expired active lists (useful for n8n cron job)
  .get('/wishlists/expired', async () => {
    const expired = await useCases.listExpiredWishlists.execute();
    return { success: true, data: expired };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Get expired wishlists',
      description: 'Fetch all active wishlists that have expired. Useful for cron jobs.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists', async ({ getAuthUser, body: { Giftistry: { Lists: { Title, ExpiresAt, AllowGroupFunds, Category, RevealSuggestions, AiEnabled, WebSearchEnabled } } } }) => {
    const user = await getAuthUser();
    const wishlist = await useCases.createWishlist.execute(
      user.userId,
      Title,
      ExpiresAt,
      AllowGroupFunds ?? false,
      Category,
      RevealSuggestions,
      AiEnabled,
      WebSearchEnabled
    );
    return { success: true, data: wishlist };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Create a new wishlist',
      description: 'Creates a new registry list for the authenticated user.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          Title: t.String(),
          ExpiresAt: t.Optional(t.Nullable(t.String())),
          AllowGroupFunds: t.Optional(t.Boolean()),
          Category: t.Optional(t.String()),
          RevealSuggestions: t.Optional(t.Boolean()),
          AiEnabled: t.Optional(t.Boolean()),
          WebSearchEnabled: t.Optional(t.Boolean()),
        })
      })
    })
  })
  .get('/wishlists', async ({ getAuthUser, query }) => {
    const user = await getAuthUser();
    const wishlists = await useCases.listWishlists.execute(user.userId, {
      bucket: (query.bucket as 'my' | 'shared' | 'archive' | 'all' | undefined) ?? 'all',
      q: query.q ?? '',
    });
    return { success: true, data: wishlists };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'List user wishlists',
      description:
        'Fetch wishlists for the authenticated user. Optional bucket (my|shared|archive|all) and q search filter. Always includes Counts for all buckets.',
      security: [{ bearerAuth: [] }]
    },
    query: t.Object({
      bucket: t.Optional(
        t.Union([
          t.Literal('my'),
          t.Literal('shared'),
          t.Literal('archive'),
          t.Literal('all'),
        ])
      ),
      q: t.Optional(t.String()),
    }),
  })
  .post('/priorities', async ({ getAuthUser, body: { Giftistry: { Priorities: { Label, Weight } } } }) => {
    const user = await getAuthUser();
    const priority = await useCases.createPriority.execute(user.userId, Label, Weight);
    return { success: true, data: priority };
  }, {
    detail: {
      tags: ['Priorities'],
      summary: 'Create a priority level',
      description: 'Create a priority category weight and label for user items.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Priorities: t.Object({
          Label: t.String(),
          Weight: t.Numeric(),
        })
      })
    })
  })
  .get('/priorities', async ({ getAuthUser, query }) => {
    const user = await getAuthUser();

    if (query?.wishlistId) {
      await getListAccessContext(user.userId, { listId: query.wishlistId });
    }

    const priorities = await useCases.listPriorities.execute(user.userId, query?.wishlistId);
    return { success: true, data: priorities };
  }, {
    query: t.Optional(t.Object({
      wishlistId: t.Optional(t.String())
    })),
    detail: {
      tags: ['Priorities'],
      summary: 'List priority levels',
      description: 'Fetch all priority categories for the authenticated user or for a specific wishlist owner.',
      security: [{ bearerAuth: [] }]
    }
  })
  .delete('/priorities/:id', async ({ getAuthUser, params: { id } }) => {
    const user = await getAuthUser();
    await useCases.deletePriority.execute(id, user.userId);
    return { success: true };
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Priorities'],
      summary: 'Delete a priority category',
      description: 'Remove a custom priority level/category created by the authenticated user.',
      security: [{ bearerAuth: [] }]
    }
  })
  .use(middleware.listAccess)
  .post('/wishlists/:listId/shares', async ({ params: { listId }, getAuthUser, checkListAccess, body: { Giftistry: { Lists: { Email, Role } } } }) => {
    await getAuthUser();
    await checkListAccess('owner');
    const share = await useCases.shareWishlist.execute(listId, Email, Role);
    return { success: true, data: share };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Share a wishlist',
      description: 'Grant a collaborator or viewer role access to a wishlist.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          Email: t.String({ format: 'email' }),
          Role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
        })
      })
    })
  })
  .get('/wishlists/:listId/shares', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('viewer');
    const shares = await useCases.listListShares.execute(listId);
    return { success: true, data: shares };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'List wishlist shares',
      description: 'List users with access to a wishlist. Available to anyone who can view the list.',
      security: [{ bearerAuth: [] }]
    }
  })
  .patch('/wishlists/:listId/shares/:shareId', async ({ params: { listId, shareId }, checkListAccess, body: { Giftistry: { Lists: { Role } } } }) => {
    await checkListAccess('owner');
    const share = await useCases.updateListShare.execute(listId, shareId, Role);
    return { success: true, data: share };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          Role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
        }),
      }),
    }),
    detail: {
      tags: ['Wishlists'],
      summary: 'Update share role',
      security: [{ bearerAuth: [] }]
    }
  })
  .delete('/wishlists/:listId/shares/:shareId', async ({ params: { listId, shareId }, checkListAccess }) => {
    await checkListAccess('owner');
    await useCases.removeListShare.execute(listId, shareId);
    return { success: true };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Remove share',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists/:listId/shares/bulk', async ({ params: { listId }, getAuthUser, checkListAccess, body: { Giftistry: { Lists: { FriendIds, Role } } } }) => {
    const user = await getAuthUser();
    await checkListAccess('owner');
    const shares = await useCases.bulkShareWishlist.execute(listId, user.userId, FriendIds, Role);
    return { success: true, data: shares };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          FriendIds: t.Array(t.String()),
          Role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
        }),
      }),
    }),
    detail: {
      tags: ['Wishlists'],
      summary: 'Bulk share wishlist with friends',
      security: [{ bearerAuth: [] }]
    }
  })
  .get('/wishlists/:listId', async ({ params: { listId }, checkListAccess }) => {
    const access = await checkListAccess('viewer');
    const wishlist = await useCases.getWishlist.execute(listId);
    if (wishlist) {
      wishlist.Role = access.role;
    }
    return { success: true, data: wishlist };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Get wishlist by ID',
      description: 'Retrieve a specific wishlist and its items. Requires appropriate access role.',
      security: [{ bearerAuth: [] }]
    }
  })
  .get('/wishlists/:listId/pdf', async ({ params: { listId }, getAuthUser, checkListAccess }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    const pdfBytes = await useCases.exportWishlistPdf.execute(listId, user.userId);
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="wishlist-${listId}.pdf"`,
      },
    });
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Export wishlist as PDF',
      description: 'Generates and downloads a beautifully formatted PDF of the wishlist and its items.',
      security: [{ bearerAuth: [] }]
    }
  })
  .get('/wishlists/:listId/export', async ({ params: { listId }, query: { format }, getAuthUser, checkListAccess }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    const result = await useCases.exportWishlistData.execute(listId, user.userId, format as 'csv' | 'xlsx' | 'txt' | 'json');
    return new Response(result.data, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  }, {
    query: t.Object({
      format: t.Union([
        t.Literal('csv'),
        t.Literal('xlsx'),
        t.Literal('txt'),
        t.Literal('json'),
      ]),
    }),
    detail: {
      tags: ['Wishlists'],
      summary: 'Export wishlist data',
      description: 'Generates and downloads a wishlist in CSV, XLSX, TXT, or JSON formats.',
      security: [{ bearerAuth: [] }]
    }
  })
  .put('/wishlists/:listId/deactivate', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('owner');
    await useCases.deactivateWishlist.execute(listId);
    return { success: true };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Deactivate a wishlist',
      description: 'Deactivate and archive a wishlist by ID. Only allowed for the owner.',
      security: [{ bearerAuth: [] }]
    }
  })
  .put('/wishlists/:listId', async ({ params: { listId }, checkListAccess, body: { Giftistry: { Lists: { Title, ExpiresAt, AllowGroupFunds, Category, RevealSuggestions, AiEnabled, WebSearchEnabled } } } }) => {
    await checkListAccess('owner');
    const updated = await useCases.updateWishlist.execute(listId, Title, ExpiresAt, AllowGroupFunds ?? false, Category, RevealSuggestions, AiEnabled, WebSearchEnabled);
    return { success: true, data: updated };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Update/Rename a wishlist',
      description: 'Update the title, expiration, and group funds settings of a wishlist. Only allowed for the owner.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          Title: t.String(),
          ExpiresAt: t.Optional(t.Nullable(t.String())),
          AllowGroupFunds: t.Optional(t.Boolean()),
          Category: t.Optional(t.String()),
          RevealSuggestions: t.Optional(t.Boolean()),
          AiEnabled: t.Optional(t.Boolean()),
          WebSearchEnabled: t.Optional(t.Boolean()),
        })
      })
    })
  })
  .delete('/wishlists/:listId', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('owner');
    await useCases.deleteWishlist.execute(listId);
    return { success: true };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Delete a wishlist and its items',
      description: 'Delete a wishlist, its comments, items, and sharing permissions permanently. Only allowed for the owner.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists/:listId/rollover', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('owner');
    const newList = await useCases.rolloverWishlist.execute(listId);
    return { success: true, data: newList };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Rollover a wishlist',
      description: 'Rollover an expired active wishlist. Deactivates the old one and creates a new active one with unpurchased items.',
      security: [{ bearerAuth: [] }]
    }
  })
  .use(inviteUseCases ? new Elysia()
    .post('/wishlists/:listId/link-invites', async ({ params: { listId }, getAuthUser, checkListAccess, body: { Giftistry: { Invites: { Role, ExpiresAt, MaxUses, Password } } } }) => {
      await checkListAccess('owner');
      const user = await getAuthUser();
      const result = await inviteUseCases.createLinkInvite.execute(
        listId,
        user.userId,
        Role ?? 'viewer',
        ExpiresAt ?? null,
        MaxUses ?? null,
        Password ?? null
      );
      return { success: true, data: result };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Invites: t.Object({
            Role: t.Optional(t.Union([t.Literal('viewer'), t.Literal('collaborator')])),
            ExpiresAt: t.Optional(t.Nullable(t.String())),
            MaxUses: t.Optional(t.Nullable(t.Numeric())),
            Password: t.Optional(t.Nullable(t.String())),
          }),
        }),
      }),
      detail: { tags: ['Invites'], summary: 'Create link invite', security: [{ bearerAuth: [] }] }
    })
    .get('/wishlists/:listId/link-invites', async ({ params: { listId }, checkListAccess }) => {
      await checkListAccess('owner');
      const invites = await inviteUseCases.listLinkInvites.execute(listId);
      return { success: true, data: invites };
    }, {
      detail: { tags: ['Invites'], summary: 'List link invites', security: [{ bearerAuth: [] }] }
    })
    .delete('/wishlists/:listId/link-invites/:inviteId', async ({ params: { listId, inviteId }, checkListAccess }) => {
      await checkListAccess('owner');
      await inviteUseCases.revokeLinkInvite.execute(listId, inviteId);
      return { success: true };
    }, {
      detail: { tags: ['Invites'], summary: 'Revoke link invite', security: [{ bearerAuth: [] }] }
    })
    .post('/wishlists/:listId/email-invites', async ({ params: { listId }, getAuthUser, checkListAccess, body: { Giftistry: { Lists: { Email, Role } } } }) => {
      await checkListAccess('owner');
      const user = await getAuthUser();
      const result = await inviteUseCases.createEmailInvite.execute(listId, Email, Role, user.userId);
      return { success: true, data: result };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Lists: t.Object({
            Email: t.String({ format: 'email' }),
            Role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
          })
        })
      }),
      detail: { tags: ['Invites'], summary: 'Create email invite', security: [{ bearerAuth: [] }] }
    })
  : new Elysia());
