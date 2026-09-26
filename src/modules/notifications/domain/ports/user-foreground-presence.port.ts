/** Whether the user currently has an open foreground `/ws/user` connection. */
export interface UserForegroundPresencePort {
  isUserForegroundConnected(userId: string): boolean;
}
