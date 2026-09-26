export const PUSH_SUBSCRIPTION_SELECT = `
  id as "Id", user_id as "UserId", platform as "Platform", transport as "Transport",
  endpoint as "Endpoint", endpoint_auth as "EndpointAuth", p256dh as "P256dh",
  is_primary as "IsPrimary", created_at as "CreatedAt", last_seen_at as "LastSeenAt"
`;
