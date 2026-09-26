export interface WishlistPresencePublishTransport {
  publish: (topic: string, data: string) => void;
  send?: (data: string) => void;
}
