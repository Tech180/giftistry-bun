export const MODERATION_COMMENT_LIST_SELECT = `
  c.id as "Id",
  c.content as "Content",
  c.commenter_name as "CommenterName",
  c.is_deleted as "IsDeleted",
  c.created_at as "CreatedAt",
  l.title as "ListTitle",
  l.id as "ListId",
  u.username as "Username"
`;
