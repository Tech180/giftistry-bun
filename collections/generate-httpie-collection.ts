/**
 * Regenerates HTTPie Desktop export files for the Giftistry API.
 *
 * Outputs:
 *   - httpie-collection-giftistry.json  (collection, schema v1.0.0)
 *   - httpie-environment-local.json     (companion environment with variables)
 *
 * Run: bun collections/generate-httpie-collection.ts
 *
 * @see https://schema.httpie.io/1.0.0.json
 * @see https://httpie.io/docs/desktop/export-json-format
 */

import {
  bodyJson,
  buildCollection,
  collectionMeta,
  environmentMeta,
  localEnvironment,
  type RequestDef,
  validateCollectionSchema,
  validateEnvironment,
  validateVariableReferences,
} from './httpie-format.ts';

const OUT_DIR = import.meta.dir;
const COLLECTION_OUT = `${OUT_DIR}/httpie-collection-giftistry.json`;
const ENVIRONMENT_OUT = `${OUT_DIR}/httpie-environment-local.json`;

const health: RequestDef[] = [
  { group: 'Health', name: 'Health Check', method: 'GET', path: '/health' },
];

const auth: RequestDef[] = [
  {
    group: 'Auth',
    name: 'Sign Up',
    method: 'POST',
    path: '/api/auth/signup',
    body: bodyJson({
      Giftistry: {
        Auth: {
          Username: 'johndoe',
          Email: 'user@example.com',
          FirstName: 'John',
          LastName: 'Doe',
          Password: 'securepassword123',
        },
      },
    }),
  },
  {
    group: 'Auth',
    name: 'Login',
    method: 'POST',
    path: '/api/auth/login',
    body: bodyJson({
      Giftistry: {
        Auth: { Username: 'user', Password: 'securepassword123' },
      },
    }),
  },
  {
    group: 'Auth',
    name: 'Verify Email',
    method: 'POST',
    path: '/api/auth/verify-email',
    body: bodyJson({ Giftistry: { Auth: { Token: '<verification-token>' } } }),
  },
  { group: 'Auth', name: 'Passkey Login Options', method: 'POST', path: '/api/auth/passkey/login/options' },
  {
    group: 'Auth',
    name: 'Passkey Login Verify',
    method: 'POST',
    path: '/api/auth/passkey/login/verify',
    headers: { Origin: 'http://localhost:3000' },
    body: bodyJson({ Giftistry: { Auth: { AuthenticationResponse: {} } } }),
  },
  {
    group: 'Auth',
    name: '2FA Login',
    method: 'POST',
    path: '/api/auth/2fa/login',
    body: bodyJson({ Giftistry: { Auth: { Ticket: '<ticket>', Code: '123456' } } }),
  },
  { group: 'Auth', name: 'Get Profile (/me)', method: 'GET', path: '/api/auth/me', auth: true },
  { group: 'Auth', name: 'List Passkeys', method: 'GET', path: '/api/auth/passkeys', auth: true },
  {
    group: 'Auth',
    name: 'Delete Passkey',
    method: 'DELETE',
    path: '/api/auth/passkeys/<passkeyId>',
    auth: true,
  },
  { group: 'Auth', name: 'Logout', method: 'POST', path: '/api/auth/logout', auth: true },
  {
    group: 'Auth',
    name: 'Update Profile',
    method: 'PUT',
    path: '/api/auth/profile',
    auth: true,
    body: bodyJson({
      Giftistry: {
        Auth: {
          Username: 'johndoe',
          FirstName: 'John',
          LastName: 'Doe',
          Bio: 'Hello world',
          Theme: 'default',
        },
      },
    }),
  },
  {
    group: 'Auth',
    name: 'Resend Verification Email',
    method: 'POST',
    path: '/api/auth/resend-verification',
    auth: true,
  },
  { group: 'Auth', name: 'Disable Account', method: 'POST', path: '/api/auth/account/disable', auth: true },
  {
    group: 'Auth',
    name: 'Delete Account',
    method: 'DELETE',
    path: '/api/auth/account',
    auth: true,
    body: bodyJson({ Giftistry: { Auth: { Password: 'securepassword123' } } }),
  },
  { group: 'Auth', name: '2FA Setup', method: 'POST', path: '/api/auth/2fa/setup', auth: true },
  {
    group: 'Auth',
    name: '2FA Enable',
    method: 'POST',
    path: '/api/auth/2fa/enable',
    auth: true,
    body: bodyJson({ Giftistry: { Auth: { Secret: '<secret>', Code: '123456' } } }),
  },
  {
    group: 'Auth',
    name: '2FA Disable',
    method: 'POST',
    path: '/api/auth/2fa/disable',
    auth: true,
    body: bodyJson({ Giftistry: { Auth: { Code: '123456' } } }),
  },
  {
    group: 'Auth',
    name: 'Passkey Register Options',
    method: 'POST',
    path: '/api/auth/passkey/register/options',
    auth: true,
  },
  {
    group: 'Auth',
    name: 'Passkey Register Verify',
    method: 'POST',
    path: '/api/auth/passkey/register/verify',
    auth: true,
    headers: { Origin: 'http://localhost:3000' },
    body: bodyJson({ Giftistry: { Auth: { RegistrationResponse: {} } } }),
  },
];

const usersThemes: RequestDef[] = [
  { group: 'Users & Themes', name: 'User Preview', method: 'GET', path: '/api/users/<userId>/preview' },
  {
    group: 'Users & Themes',
    name: 'List Custom Themes',
    method: 'GET',
    path: '/api/themes/custom',
    auth: true,
  },
  {
    group: 'Users & Themes',
    name: 'Save Custom Theme',
    method: 'POST',
    path: '/api/themes/custom',
    auth: true,
    body: bodyJson({
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
    }),
  },
  {
    group: 'Users & Themes',
    name: 'Delete Custom Theme',
    method: 'DELETE',
    path: '/api/themes/custom/<themeId>',
    auth: true,
  },
  { group: 'Users & Themes', name: 'Core Theme CSS', method: 'GET', path: '/api/themes/core/css' },
  {
    group: 'Users & Themes',
    name: 'Theme CSS',
    method: 'GET',
    path: '/api/themes/default/light/css',
  },
];

const system: RequestDef[] = [
  { group: 'System', name: 'System Status', method: 'GET', path: '/api/system/status' },
  {
    group: 'System',
    name: 'Initial Setup',
    method: 'POST',
    path: '/api/system/setup',
    body: bodyJson({
      Giftistry: {
        Setup: {
          DbType: 'postgres',
          DbUrl: 'postgresql://user:pass@localhost:5432/giftistry',
          SmtpType: 'smtp',
          SmtpHost: 'smtp.example.com',
          SmtpPort: 587,
          SmtpUser: 'user@example.com',
          SmtpPass: 'password',
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
    }),
  },
  { group: 'System', name: 'Get System Settings', method: 'GET', path: '/api/system/settings', auth: true },
  {
    group: 'System',
    name: 'Save System Settings',
    method: 'POST',
    path: '/api/system/settings',
    auth: true,
    body: bodyJson({
      Giftistry: {
        System: {
          DbType: 'postgres',
          SmtpType: 'smtp',
          AiEnabled: true,
          AiProvider: 'local',
          AiEndpoint: 'http://192.168.100.80:11434',
          AiModel: 'qwen3:8b',
        },
      },
    }),
  },
  {
    group: 'System',
    name: 'AI Check',
    method: 'POST',
    path: '/api/system/ai-check',
    auth: true,
    body: bodyJson({
      Giftistry: {
        System: {
          AiProvider: 'local',
          AiEndpoint: 'http://192.168.100.80:11434',
          AiModel: 'qwen3:8b',
        },
      },
    }),
  },
  {
    group: 'System',
    name: 'Transfer Ownership',
    method: 'POST',
    path: '/api/system/transfer-ownership',
    auth: true,
    body: bodyJson({ Giftistry: { Ownership: { UserId: '<target-user-id>' } } }),
  },
  { group: 'System', name: 'Delete Server', method: 'POST', path: '/api/system/delete-server', auth: true },
];

const wishlists: RequestDef[] = [
  {
    group: 'Wishlists',
    name: 'List Expired Wishlists',
    method: 'GET',
    path: '/api/wishlists/expired',
    auth: true,
  },
  {
    group: 'Wishlists',
    name: 'Create Wishlist',
    method: 'POST',
    path: '/api/wishlists',
    auth: true,
    body: bodyJson({
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
    }),
  },
  { group: 'Wishlists', name: 'List Wishlists', method: 'GET', path: '/api/wishlists', auth: true },
  {
    group: 'Wishlists',
    name: 'Get Wishlist',
    method: 'GET',
    path: '/api/wishlists/<listId>',
    auth: true,
  },
  {
    group: 'Wishlists',
    name: 'Update Wishlist',
    method: 'PUT',
    path: '/api/wishlists/<listId>',
    auth: true,
    body: bodyJson({
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
    }),
  },
  {
    group: 'Wishlists',
    name: 'Deactivate Wishlist',
    method: 'PUT',
    path: '/api/wishlists/<listId>/deactivate',
    auth: true,
  },
  {
    group: 'Wishlists',
    name: 'Delete Wishlist',
    method: 'DELETE',
    path: '/api/wishlists/<listId>',
    auth: true,
  },
  {
    group: 'Wishlists',
    name: 'Rollover Wishlist',
    method: 'POST',
    path: '/api/wishlists/<listId>/rollover',
    auth: true,
  },
];

const priorities: RequestDef[] = [
  {
    group: 'Priorities',
    name: 'Create Priority',
    method: 'POST',
    path: '/api/priorities',
    auth: true,
    body: bodyJson({ Giftistry: { Priorities: { Label: 'High', Weight: 3 } } }),
  },
  { group: 'Priorities', name: 'List Priorities', method: 'GET', path: '/api/priorities', auth: true },
  {
    group: 'Priorities',
    name: 'List Priorities for Wishlist',
    method: 'GET',
    path: '/api/priorities',
    auth: true,
    query: { wishlistId: '<listId>' },
  },
  {
    group: 'Priorities',
    name: 'Delete Priority',
    method: 'DELETE',
    path: '/api/priorities/<priorityId>',
    auth: true,
  },
];

const shares: RequestDef[] = [
  {
    group: 'Shares',
    name: 'Share Wishlist',
    method: 'POST',
    path: '/api/wishlists/<listId>/shares',
    auth: true,
    body: bodyJson({ Giftistry: { Lists: { Email: 'friend@example.com', Role: 'viewer' } } }),
  },
  {
    group: 'Shares',
    name: 'List Shares',
    method: 'GET',
    path: '/api/wishlists/<listId>/shares',
    auth: true,
  },
  {
    group: 'Shares',
    name: 'Update Share Role',
    method: 'PATCH',
    path: '/api/wishlists/<listId>/shares/<shareId>',
    auth: true,
    body: bodyJson({ Giftistry: { Lists: { Role: 'collaborator' } } }),
  },
  {
    group: 'Shares',
    name: 'Remove Share',
    method: 'DELETE',
    path: '/api/wishlists/<listId>/shares/<shareId>',
    auth: true,
  },
  {
    group: 'Shares',
    name: 'Bulk Share with Friends',
    method: 'POST',
    path: '/api/wishlists/<listId>/shares/bulk',
    auth: true,
    body: bodyJson({ Giftistry: { Lists: { FriendIds: ['<friend-id>'], Role: 'viewer' } } }),
  },
];

const invites: RequestDef[] = [
  {
    group: 'Invites',
    name: 'Create Link Invite',
    method: 'POST',
    path: '/api/wishlists/<listId>/link-invites',
    auth: true,
    body: bodyJson({
      Giftistry: { Invites: { Role: 'viewer', ExpiresAt: null, MaxUses: null, Password: null } },
    }),
  },
  {
    group: 'Invites',
    name: 'List Link Invites',
    method: 'GET',
    path: '/api/wishlists/<listId>/link-invites',
    auth: true,
  },
  {
    group: 'Invites',
    name: 'Revoke Link Invite',
    method: 'DELETE',
    path: '/api/wishlists/<listId>/link-invites/<inviteId>',
    auth: true,
  },
  {
    group: 'Invites',
    name: 'Create Email Invite',
    method: 'POST',
    path: '/api/wishlists/<listId>/email-invites',
    auth: true,
    body: bodyJson({ Giftistry: { Lists: { Email: 'guest@example.com', Role: 'viewer' } } }),
  },
  {
    group: 'Invites',
    name: 'Get Link Invite Details',
    method: 'GET',
    path: '/api/invites/link/<token_invite>',
  },
  {
    group: 'Invites',
    name: 'Accept Link Invite',
    method: 'POST',
    path: '/api/invites/link/<token_invite>/accept',
    auth: true,
    body: bodyJson({ Giftistry: { Invites: { Password: null } } }),
  },
  {
    group: 'Invites',
    name: 'Accept Email Invite',
    method: 'POST',
    path: '/api/invites/email/<token_invite>/accept',
    auth: true,
  },
];

const items: RequestDef[] = [
  {
    group: 'Items',
    name: 'List Items',
    method: 'GET',
    path: '/api/wishlists/<listId>/items',
    auth: true,
  },
  {
    group: 'Items',
    name: 'Add Item',
    method: 'POST',
    path: '/api/wishlists/<listId>/items',
    auth: true,
    body: bodyJson({
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
    }),
  },
  {
    group: 'Items',
    name: 'Update Item',
    method: 'PUT',
    path: '/api/items/<itemId>',
    auth: true,
    body: bodyJson({
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
    }),
  },
  { group: 'Items', name: 'Delete Item', method: 'DELETE', path: '/api/items/<itemId>', auth: true },
  {
    group: 'Items',
    name: 'Get Item Reviews',
    method: 'GET',
    path: '/api/items/<itemId>/reviews',
    auth: true,
  },
  {
    group: 'Items',
    name: 'Add Item Link',
    method: 'POST',
    path: '/api/items/<itemId>/links',
    auth: true,
    body: bodyJson({ Giftistry: { Items: { Url: 'https://example.com/product' } } }),
  },
  {
    group: 'Items',
    name: 'Claim Item',
    method: 'POST',
    path: '/api/items/<itemId>/claims',
    auth: true,
    body: bodyJson({
      Giftistry: {
        Items: {
          Amount: 199.99,
          ClaimedByName: 'Jane',
          Anonymous: false,
          Quantity: 1,
          Selection: null,
        },
      },
    }),
  },
  { group: 'Items', name: 'Unclaim Item', method: 'DELETE', path: '/api/items/<itemId>/claims', auth: true },
  {
    group: 'Items',
    name: 'Extract Metadata',
    method: 'POST',
    path: '/api/items/extract-metadata',
    auth: true,
    body: bodyJson({ Giftistry: { Items: { Url: 'https://example.com/product' } } }),
  },
  {
    group: 'Items',
    name: 'Field Definitions',
    method: 'GET',
    path: '/api/items/field-definitions',
    auth: true,
    query: { category: 'electronics' },
  },
];

const comments: RequestDef[] = [
  {
    group: 'Comments',
    name: 'List Comments',
    method: 'GET',
    path: '/api/wishlists/<listId>/comments',
    auth: true,
  },
  {
    group: 'Comments',
    name: 'Add Comment',
    method: 'POST',
    path: '/api/wishlists/<listId>/comments',
    auth: true,
    body: bodyJson({
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
    }),
  },
  {
    group: 'Comments',
    name: 'React to Comment',
    method: 'POST',
    path: '/api/comments/<commentId>/react',
    auth: true,
    body: bodyJson({ Giftistry: { Comments: { Reaction: '👍' } } }),
  },
  {
    group: 'Comments',
    name: 'Delete Comment',
    method: 'DELETE',
    path: '/api/wishlists/<listId>/comments/<commentId>',
    auth: true,
  },
];

const friends: RequestDef[] = [
  { group: 'Friends', name: 'List Friends', method: 'GET', path: '/api/friends', auth: true },
  {
    group: 'Friends',
    name: 'List Friend Requests',
    method: 'GET',
    path: '/api/friends/requests',
    auth: true,
  },
  {
    group: 'Friends',
    name: 'Send Friend Request',
    method: 'POST',
    path: '/api/friends/requests',
    auth: true,
    body: bodyJson({ Giftistry: { Friends: { ReceiverId: '<user-id>' } } }),
  },
  {
    group: 'Friends',
    name: 'Accept Friend Request',
    method: 'POST',
    path: '/api/friends/requests/<requestId>/accept',
    auth: true,
  },
  {
    group: 'Friends',
    name: 'Decline Friend Request',
    method: 'POST',
    path: '/api/friends/requests/<requestId>/decline',
    auth: true,
  },
  {
    group: 'Friends',
    name: 'Cancel Friend Request',
    method: 'POST',
    path: '/api/friends/requests/<requestId>/cancel',
    auth: true,
  },
  { group: 'Friends', name: 'Unfriend', method: 'DELETE', path: '/api/friends/<friendId>', auth: true },
  {
    group: 'Friends',
    name: 'Search Users',
    method: 'GET',
    path: '/api/users/search',
    auth: true,
    query: { q: 'john' },
  },
];

const notifications: RequestDef[] = [
  { group: 'Notifications', name: 'List Notifications', method: 'GET', path: '/api/notifications', auth: true },
  {
    group: 'Notifications',
    name: 'Mark Notification Read',
    method: 'PATCH',
    path: '/api/notifications/<id>/read',
    auth: true,
  },
  {
    group: 'Notifications',
    name: 'Mark All Read',
    method: 'POST',
    path: '/api/notifications/read-all',
    auth: true,
  },
  {
    group: 'Notifications',
    name: 'Delete Notification',
    method: 'DELETE',
    path: '/api/notifications/<id>',
    auth: true,
  },
  {
    group: 'Notifications',
    name: 'Clear All Notifications',
    method: 'DELETE',
    path: '/api/notifications',
    auth: true,
  },
  {
    group: 'Notifications',
    name: 'Get Preferences',
    method: 'GET',
    path: '/api/notifications/preferences',
    auth: true,
  },
  {
    group: 'Notifications',
    name: 'Update Preferences',
    method: 'PATCH',
    path: '/api/notifications/preferences',
    auth: true,
    body: bodyJson({
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
    }),
  },
];

const reports: RequestDef[] = [
  {
    group: 'Reports',
    name: 'Submit Report',
    method: 'POST',
    path: '/api/reports',
    auth: true,
    body: bodyJson({
      Giftistry: {
        Report: {
          TargetType: 'comment',
          TargetId: '<target-id>',
          Reason: 'Inappropriate content',
        },
      },
    }),
  },
];

const admin: RequestDef[] = [
  { group: 'Admin', name: 'Overview', method: 'GET', path: '/api/admin/overview', auth: true },
  { group: 'Admin', name: 'List Users', method: 'GET', path: '/api/admin/users', auth: true },
  {
    group: 'Admin',
    name: 'List Users (filtered)',
    method: 'GET',
    path: '/api/admin/users',
    auth: true,
    query: { q: 'john', page: '1', limit: '20' },
  },
  {
    group: 'Admin',
    name: 'Create User',
    method: 'POST',
    path: '/api/admin/users',
    auth: true,
    body: bodyJson({
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
    }),
  },
  { group: 'Admin', name: 'Get User', method: 'GET', path: '/api/admin/users/<id>', auth: true },
  {
    group: 'Admin',
    name: 'Update User',
    method: 'PATCH',
    path: '/api/admin/users/<id>',
    auth: true,
    body: bodyJson({
      Giftistry: {
        User: {
          Username: 'updateduser',
          FirstName: 'Updated',
          LastName: 'User',
        },
      },
    }),
  },
  {
    group: 'Admin',
    name: 'Update User Policy',
    method: 'PATCH',
    path: '/api/admin/users/<id>/policy',
    auth: true,
    body: bodyJson({
      Giftistry: {
        Policy: {
          IsAdmin: false,
          IsDisabled: false,
          ForcePasswordChange: false,
        },
      },
    }),
  },
  {
    group: 'Admin',
    name: 'Reset Password',
    method: 'POST',
    path: '/api/admin/users/<id>/reset-password',
    auth: true,
    body: bodyJson({
      Giftistry: {
        Password: { Password: 'newpassword123', ForcePasswordChange: true },
      },
    }),
  },
  { group: 'Admin', name: 'Unlock User', method: 'POST', path: '/api/admin/users/<id>/unlock', auth: true },
  {
    group: 'Admin',
    name: 'Revoke Sessions',
    method: 'POST',
    path: '/api/admin/users/<id>/revoke-sessions',
    auth: true,
  },
  { group: 'Admin', name: 'Delete User', method: 'DELETE', path: '/api/admin/users/<id>', auth: true },
  { group: 'Admin', name: 'Get Site Policy', method: 'GET', path: '/api/admin/site-policy', auth: true },
  {
    group: 'Admin',
    name: 'Update Site Policy',
    method: 'PATCH',
    path: '/api/admin/site-policy',
    auth: true,
    body: bodyJson({ Giftistry: { SitePolicy: { RegistrationMode: 'open' } } }),
  },
  { group: 'Admin', name: 'Audit Log', method: 'GET', path: '/api/admin/audit', auth: true },
  {
    group: 'Admin',
    name: 'Audit Log (filtered)',
    method: 'GET',
    path: '/api/admin/audit',
    auth: true,
    query: { page: '1', limit: '50' },
  },
  {
    group: 'Admin',
    name: 'Moderation Comments',
    method: 'GET',
    path: '/api/admin/moderation/comments',
    auth: true,
  },
  {
    group: 'Admin',
    name: 'Delete Moderated Comment',
    method: 'DELETE',
    path: '/api/admin/moderation/comments/<id>',
    auth: true,
  },
  { group: 'Admin', name: 'List Reports', method: 'GET', path: '/api/admin/reports', auth: true },
  {
    group: 'Admin',
    name: 'Handle Report',
    method: 'PATCH',
    path: '/api/admin/reports/<id>',
    auth: true,
    body: bodyJson({ Giftistry: { Report: { Status: 'resolved' } } }),
  },
];

const allRequests: RequestDef[] = [
  ...health,
  ...auth,
  ...usersThemes,
  ...system,
  ...wishlists,
  ...priorities,
  ...shares,
  ...invites,
  ...items,
  ...comments,
  ...friends,
  ...notifications,
  ...reports,
  ...admin,
];

const collection = buildCollection('Giftistry', allRequests, {
  // "gift" is not in the HTTPie v1.0.0 IconName enum; star is the closest valid option.
  icon: { name: 'star', color: 'pink' },
});

const environment = localEnvironment();

const collectionExport = { meta: collectionMeta(), entry: collection };
const environmentExport = { meta: environmentMeta(), entry: environment };

const collectionErrors = validateCollectionSchema(collection);
const environmentErrors = validateEnvironment(environment);
const variableErrors = validateVariableReferences(collection, environment);

if (collectionErrors.length > 0) {
  console.error('Collection validation failed:');
  for (const err of collectionErrors) console.error(`  - ${err}`);
  process.exit(1);
}

if (environmentErrors.length > 0) {
  console.error('Environment validation failed:');
  for (const err of environmentErrors) console.error(`  - ${err}`);
  process.exit(1);
}

if (variableErrors.length > 0) {
  console.error('Variable reference validation failed:');
  for (const err of variableErrors) console.error(`  - ${err}`);
  process.exit(1);
}

await Bun.write(COLLECTION_OUT, JSON.stringify(collectionExport, null, 2) + '\n');
await Bun.write(ENVIRONMENT_OUT, JSON.stringify(environmentExport, null, 2) + '\n');

console.log(`Wrote ${collection.requests.length} requests to ${COLLECTION_OUT}`);
console.log(`Wrote ${environment.variables.length} variables to ${ENVIRONMENT_OUT}`);
