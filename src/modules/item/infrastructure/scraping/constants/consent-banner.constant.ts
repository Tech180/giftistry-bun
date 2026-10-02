export const CONSENT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#CybotCookiebotDialogBodyButtonAccept',
  'button[id*="accept" i][class*="cookie" i]',
  '[data-testid="cookie-accept"]',
] as const;

export const CONSENT_BUTTON_TEXT =
  /^(accept all cookies|accept all|accept|allow all|i agree|agree|got it|ok)$/i;
