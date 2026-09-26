/** Minimum length when strong passwords are required. */
export const PASSWORD_MIN_LENGTH_STRONG = 8;

/** Floor length when strong passwords are disabled. */
export const PASSWORD_MIN_LENGTH_BASIC = 6;

/** @deprecated Use PASSWORD_MIN_LENGTH_STRONG */
export const PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH_STRONG;

export const PASSWORD_POLICY_MESSAGE_STRONG =
  'Password must be at least 8 characters and include at least one letter and one number';

export const PASSWORD_POLICY_MESSAGE_BASIC = 'Password must be at least 6 characters';

export const PASSWORD_POLICY_MESSAGE = PASSWORD_POLICY_MESSAGE_STRONG;
