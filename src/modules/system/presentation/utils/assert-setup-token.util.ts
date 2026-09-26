import { AppError } from '@/common/domain/errors/app-error';
import { getEnv } from '@/common/config/utils/get-env.util';
import { timingSafeEqualString } from '@/common/utils/public-app-url.util';
import { SETUP_TOKEN_HEADER } from '../constants/setup-token-header.constant';

export function assertSetupToken(request: Request, bodyToken?: string): void {
  const expected = getEnv().GIFTISTRY_SETUP_TOKEN;
  if (!expected) return;

  const headerToken = request.headers.get(SETUP_TOKEN_HEADER) ?? '';
  const provided = headerToken || bodyToken || '';
  if (!provided || !timingSafeEqualString(provided, expected)) {
    throw new AppError('Invalid or missing setup token', 403, 'FORBIDDEN');
  }
}
