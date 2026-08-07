/**
 * Curated HTTPie overlays keyed by `METHOD /httpie-path`.
 * Overlay entries must match OpenAPI operations; orphans fail generation.
 */

import type { RequestOverlay } from './openapi-to-request-defs.ts';
import { overlayKey } from './public-routes.ts';

export const REQUEST_OVERLAY: Record<string, RequestOverlay> = {
  [overlayKey('POST', '/api/auth/signup')]: {
    name: 'Sign Up',
    group: 'Auth',
    body: {
      Giftistry: {
        Auth: {
          Username: 'johndoe',
          Email: 'user@example.com',
          FirstName: 'John',
          LastName: 'Doe',
          Password: 'securepassword123',
        },
      },
    },
  },
  [overlayKey('POST', '/api/auth/login')]: {
    name: 'Login',
    group: 'Auth',
    body: {
      Giftistry: {
        Auth: { Username: 'user', Password: 'securepassword123' },
      },
    },
  },
  [overlayKey('POST', '/api/auth/passkey/login/verify')]: {
    name: 'Passkey Login Verify',
    headers: { Origin: 'http://localhost:3000' },
    body: { Giftistry: { Auth: { AuthenticationResponse: {} } } },
  },
  [overlayKey('POST', '/api/auth/2fa/login')]: {
    name: '2FA Login',
    body: { Giftistry: { Auth: { Ticket: '<ticket>', Code: '123456' } } },
  },
  [overlayKey('GET', '/api/auth/me')]: {
    name: 'Get Profile (/me)',
    group: 'Auth',
  },
  [overlayKey('PUT', '/api/auth/profile')]: {
    name: 'Update Profile',
    body: {
      Giftistry: {
        Auth: {
          Username: 'johndoe',
          FirstName: 'John',
          LastName: 'Doe',
          Bio: 'Hello world',
          Theme: 'default',
        },
      },
    },
  },
  [overlayKey('POST', '/api/auth/password')]: {
    name: 'Change Password',
    group: 'Auth',
    body: {
      Giftistry: {
        Auth: {
          CurrentPassword: 'securepassword123',
          NewPassword: 'newsecurepassword123',
        },
      },
    },
  },
  [overlayKey('GET', '/api/auth/onboarding')]: {
    name: 'Get Onboarding State',
    group: 'Auth',
  },
  [overlayKey('PATCH', '/api/auth/onboarding')]: {
    name: 'Patch Onboarding',
    group: 'Auth',
    body: {
      Giftistry: {
        Onboarding: {
          FirstName: 'John',
          LastName: 'Doe',
          Theme: 'default',
          CompleteUser: true,
        },
      },
    },
  },
  [overlayKey('DELETE', '/api/auth/account')]: {
    name: 'Delete Account',
    body: { Giftistry: { Auth: { Password: 'securepassword123' } } },
  },
  [overlayKey('POST', '/api/auth/2fa/enable')]: {
    name: '2FA Enable',
    body: { Giftistry: { Auth: { Secret: '<secret>', Code: '123456' } } },
  },
  [overlayKey('POST', '/api/auth/2fa/disable')]: {
    name: '2FA Disable',
    body: { Giftistry: { Auth: { Code: '123456' } } },
  },
  [overlayKey('POST', '/api/auth/passkey/register/verify')]: {
    name: 'Passkey Register Verify',
    headers: { Origin: 'http://localhost:3000' },
    body: { Giftistry: { Auth: { RegistrationResponse: {} } } },
  },
  [overlayKey('POST', '/api/themes/custom')]: {
    name: 'Save Custom Theme',
    group: 'Users & Themes',
    body: {
      Giftistry: {
        Theme: {
          Id: 'my-theme',
          Name: 'My Theme',
          Colors: {
            Primary: 'hsl(220 90% 56%)',
            Bg: 'hsl(220 20% 10%)',
            Surface: 'hsl(220 20% 14%)',
            Border: 'hsl(220 15% 22%)',
            Text: 'hsl(220 10% 95%)',
            TextMuted: 'hsl(220 10% 65%)',
          },
        },
      },
    },
  },
  [overlayKey('POST', '/api/system/setup')]: {
    name: 'Initial Setup',
    group: 'System',
    body: {
      Giftistry: {
        Setup: {
          DbType: 'local',
          DbUrl: '',
          SmtpType: 'local',
          SmtpHost: '',
          SmtpPort: 587,
          SmtpUser: '',
          SmtpPass: '',
          SmtpSecure: false,
          SmtpFrom: 'Giftistry <noreply@example.com>',
          Admin: {
            Username: 'admin',
            Email: 'admin@example.com',
            Password: 'securepassword123',
            FirstName: 'Admin',
            LastName: 'User',
          },
        },
      },
    },
  },
  [overlayKey('POST', '/api/system/settings')]: {
    name: 'Save System Settings',
    body: {
      Giftistry: {
        System: {
          AiEnabled: true,
          AiWebSearchEnabled: false,
          AllowSetup: false,
        },
      },
    },
  },
  [overlayKey('POST', '/api/system/ai-check')]: {
    name: 'AI Check',
    body: {
      Giftistry: {
        System: {
          AiFastProvider: 'openrouter',
          AiFastEndpoint: '',
          AiFastModel: 'openai/gpt-4o-mini',
        },
      },
    },
  },
  [overlayKey('POST', '/api/system/transfer-ownership')]: {
    name: 'Transfer Ownership',
    body: { Giftistry: { Ownership: { UserId: '<target-user-id>' } } },
  },
  [overlayKey('POST', '/api/wishlists')]: {
    name: 'Create Wishlist',
    group: 'Wishlists',
    body: {
      Giftistry: {
        Lists: {
          Title: 'Birthday Wishlist',
          ExpiresAt: '2026-12-31T23:59:59.000Z',
          AllowGroupFunds: false,
          Category: 'birthday',
          RevealSuggestions: true,
          AiEnabled: true,
        },
      },
    },
  },
  [overlayKey('PUT', '/api/wishlists/<listId>')]: {
    name: 'Update Wishlist',
    body: {
      Giftistry: {
        Lists: {
          Title: 'Updated Wishlist',
          ExpiresAt: null,
          AllowGroupFunds: true,
          Category: 'birthday',
          RevealSuggestions: true,
          AiEnabled: false,
        },
      },
    },
  },
  [overlayKey('POST', '/api/priorities')]: {
    name: 'Create Priority',
    body: { Giftistry: { Priorities: { Label: 'High', Weight: 3 } } },
  },
  [overlayKey('POST', '/api/wishlists/<listId>/shares')]: {
    name: 'Share Wishlist',
    body: { Giftistry: { Lists: { Email: 'friend@example.com', Role: 'viewer' } } },
  },
  [overlayKey('PATCH', '/api/wishlists/<listId>/shares/<shareId>')]: {
    name: 'Update Share Role',
    body: { Giftistry: { Lists: { Role: 'collaborator' } } },
  },
  [overlayKey('POST', '/api/wishlists/<listId>/shares/bulk')]: {
    name: 'Bulk Share with Friends',
    body: { Giftistry: { Lists: { FriendIds: ['<friend-id>'], Role: 'viewer' } } },
  },
  [overlayKey('POST', '/api/wishlists/<listId>/link-invites')]: {
    name: 'Create Link Invite',
    body: {
      Giftistry: { Invites: { Role: 'viewer', ExpiresAt: null, MaxUses: null, Password: null } },
    },
  },
  [overlayKey('POST', '/api/wishlists/<listId>/email-invites')]: {
    name: 'Create Email Invite',
    body: { Giftistry: { Lists: { Email: 'guest@example.com', Role: 'viewer' } } },
  },
  [overlayKey('POST', '/api/invites/link/<token>/accept')]: {
    name: 'Accept Link Invite',
    body: { Giftistry: { Invites: { Password: null } } },
  },
  [overlayKey('POST', '/api/wishlists/<listId>/items')]: {
    name: 'Add Item',
    group: 'Items',
    body: {
      Giftistry: {
        Items: {
          Name: 'Wireless Headphones',
          Description: 'Noise cancelling',
          PriorityId: null,
          IsHiddenIdea: false,
          LinkUrl: 'https://example.com/headphones',
          Price: 199.99,
          WebsiteName: 'Example Store',
          Category: 'electronics',
          Priority: 2,
          SharedWithUserIds: [],
        },
      },
    },
  },
  [overlayKey('PUT', '/api/items/<itemId>')]: {
    name: 'Update Item',
    body: {
      Giftistry: {
        Items: {
          Name: 'Updated Headphones',
          Description: 'Updated description',
          PriorityId: null,
          Category: 'electronics',
          Priority: 1,
          SharedWithUserIds: [],
          LinkUrl: 'https://example.com/headphones-v2',
          Price: 179.99,
          WebsiteName: 'Example Store',
        },
      },
    },
  },
  [overlayKey('POST', '/api/items/<itemId>/links')]: {
    name: 'Add Item Link',
    body: { Giftistry: { Items: { Url: 'https://example.com/product' } } },
  },
  [overlayKey('POST', '/api/items/<itemId>/claims')]: {
    name: 'Claim Item',
    body: {
      Giftistry: {
        Items: {
          Amount: 199.99,
          ClaimedByName: 'Jane',
          Anonymous: false,
          Quantity: 1,
          Selection: null,
        },
      },
    },
  },
  [overlayKey('GET', '/api/items/field-definitions')]: {
    name: 'Field Definitions',
    query: { category: 'electronics' },
  },
  [overlayKey('POST', '/api/wishlists/<listId>/comments')]: {
    name: 'Add Comment',
    body: {
      Giftistry: {
        Comments: {
          Content: 'Great list!',
          CommenterName: 'Jane',
          IsOwnerVisible: true,
          IsRollover: false,
          ParentId: null,
          ImageUrl: null,
        },
      },
    },
  },
  [overlayKey('POST', '/api/comments/<commentId>/react')]: {
    name: 'React to Comment',
    body: { Giftistry: { Comments: { Reaction: '👍' } } },
  },
  [overlayKey('POST', '/api/friends/requests')]: {
    name: 'Send Friend Request',
    body: { Giftistry: { Friends: { ReceiverId: '<user-id>' } } },
  },
  [overlayKey('GET', '/api/users/search')]: {
    name: 'Search Users',
    query: { q: 'john' },
  },
  [overlayKey('PATCH', '/api/notifications/preferences')]: {
    name: 'Update Preferences',
    body: {
      Giftistry: {
        Notifications: {
          EmailAlerts: true,
          Marketing: false,
          FriendRequests: true,
          ListShares: true,
          ItemClaims: true,
          Comments: true,
        },
      },
    },
  },
  [overlayKey('POST', '/api/reports')]: {
    name: 'Submit Report',
    group: 'Reports',
    body: {
      Giftistry: {
        Report: {
          TargetType: 'comment',
          TargetId: '<target-id>',
          Reason: 'Inappropriate content',
        },
      },
    },
  },
  [overlayKey('POST', '/api/admin/users')]: {
    name: 'Create User',
    body: {
      Giftistry: {
        AdminUser: {
          Username: 'newuser',
          Email: 'newuser@example.com',
          Password: 'securepassword123',
          FirstName: 'New',
          LastName: 'User',
          IsAdmin: false,
          EmailVerified: true,
        },
      },
    },
  },
  [overlayKey('PATCH', '/api/admin/users/<id>')]: {
    name: 'Update User',
    body: {
      Giftistry: {
        User: {
          Username: 'updateduser',
          FirstName: 'Updated',
          LastName: 'User',
        },
      },
    },
  },
  [overlayKey('PATCH', '/api/admin/users/<id>/policy')]: {
    name: 'Update User Policy',
    body: {
      Giftistry: {
        Policy: {
          IsAdmin: false,
          IsDisabled: false,
          ForcePasswordChange: false,
        },
      },
    },
  },
  [overlayKey('POST', '/api/admin/users/<id>/reset-password')]: {
    name: 'Reset Password',
    body: {
      Giftistry: {
        Password: { Password: 'newpassword123', ForcePasswordChange: true },
      },
    },
  },
  [overlayKey('PATCH', '/api/admin/site-policy')]: {
    name: 'Update Site Policy',
    body: { Giftistry: { SitePolicy: { RegistrationMode: 'open' } } },
  },
  [overlayKey('PATCH', '/api/admin/reports/<id>')]: {
    name: 'Handle Report',
    body: { Giftistry: { Report: { Status: 'resolved' } } },
  },
};
