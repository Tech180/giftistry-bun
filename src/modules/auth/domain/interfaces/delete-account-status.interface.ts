import type { AdminAccountStatus } from './admin-account-status.interface';

export interface DeleteAccountStatus extends AdminAccountStatus {
  authHash: string;
}
