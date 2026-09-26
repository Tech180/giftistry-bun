import type { ListShare } from './list-share.interface';

export interface ListShareWithUser extends ListShare {
  Username: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Avatar: string | null;
}
