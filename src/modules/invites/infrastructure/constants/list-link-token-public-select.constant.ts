export const LIST_LINK_TOKEN_PUBLIC_SELECT = `
  id as "Id", list_id as "ListId", token as "Token", role as "Role", created_by as "CreatedBy",
  expires_at as "ExpiresAt", max_uses as "MaxUses", use_count as "UseCount",
  revoked_at as "RevokedAt", created_at as "CreatedAt",
  (password_hash IS NOT NULL) as "PasswordProtected"
`;
