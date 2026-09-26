import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';

export function statusForDomainCode(errorCode: string): number {
  return DOMAIN_ERROR_STATUS[errorCode] ?? 400;
}
