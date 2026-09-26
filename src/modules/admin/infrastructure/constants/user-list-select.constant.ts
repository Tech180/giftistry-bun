export const USER_LIST_SELECT = `
  u.id as "Id",
  u.username as "Username",
  u.email as "Email",
  u.is_owner as "IsOwner",
  u.is_admin as "IsAdmin",
  u.is_disabled as "IsDisabled",
  u.locked_until as "LockedUntil",
  u.last_login_at as "LastLoginAt",
  u.last_online as "LastOnline"
`;
