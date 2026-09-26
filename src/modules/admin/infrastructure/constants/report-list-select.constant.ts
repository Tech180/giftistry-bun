export const REPORT_LIST_SELECT = `
  r.id as "Id",
  r.target_type as "TargetType",
  r.target_id as "TargetId",
  r.reason as "Reason",
  r.status as "Status",
  r.created_at as "CreatedAt",
  reporter.username as "ReporterUsername"
`;
