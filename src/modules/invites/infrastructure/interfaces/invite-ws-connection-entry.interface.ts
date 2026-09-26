export interface InviteWsConnectionEntry {
  send: (data: string) => void;
  close: () => void;
}
