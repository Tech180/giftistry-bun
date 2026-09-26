export const COMMENT_SELECT = `
  id as "Id", list_id as "ListId", user_id as "UserId", commenter_name as "CommenterName",
  content as "Content", is_owner_visible as "IsOwnerVisible", is_rollover as "IsRollover",
  is_deleted as "IsDeleted", parent_id as "ParentId", image_url as "ImageUrl",
  visible_to_user_ids as "VisibleToUserIds", created_at as "CreatedAt"
`;
