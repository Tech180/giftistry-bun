export type WishlistWsRoomEntry = {
  username: string;
  userId: string;
  send: (data: string) => void;
};
