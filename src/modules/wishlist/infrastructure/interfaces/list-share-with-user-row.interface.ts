import type { ListShareRow } from './list-share-row.interface';

export interface ListShareWithUserRow extends ListShareRow {
  Username: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Avatar: string | null;
}
