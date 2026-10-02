export interface ValidateOptions {
  titleFromSlug?: boolean;
  /** Page URL used to prefer short-link-shell classification over bot-check markers. */
  url?: string;
  httpStatus?: number;
}
