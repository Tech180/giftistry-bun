export const ITEM_SELECT = `
  i.id as "Id", i.list_id as "ListId", i.priority_id as "PriorityId",
  i.suggested_by_user_id as "SuggestedByUserId", u.username as "SuggestedByUsername",
  u.first_name as "SuggestedByFirstName", u.last_name as "SuggestedByLastName",
  i.name as "Name", i.description as "Description",
  i.is_hidden_idea as "IsHiddenIdea", i.is_suggestion as "IsSuggestion",
  i.category as "Category", i.priority as "Priority", i.created_at as "CreatedAt",
  i.is_favorite as "IsFavorite", i.is_pinned as "IsPinned",
  i.desired_quantity as "DesiredQuantity", i.multi_count as "MultiCount",
  i.other_users_can_see as "OtherUsersCanSee",
  i.custom_fields as "CustomFields", i.variations as "Variations",
  i.photos as "Photos",
  i.allow_substitutions as "AllowSubstitutions",
  i.is_substitution as "IsSubstitution",
  i.substitution_for_item_id as "SubstitutionForItemId"
`;
