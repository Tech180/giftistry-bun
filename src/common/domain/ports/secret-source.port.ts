import { SECRET_NAMES } from '../constants/secret-names.constant';

export type SecretName = (typeof SECRET_NAMES)[number];

export interface SecretSource {
  /** Returns trimmed secret or undefined if unset. */
  get(name: SecretName): string | undefined;
}

export { SECRET_NAMES };
