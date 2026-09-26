/** In-memory registry of active `/ws/user` connections for foreground push skip. */
export const USER_WS_CONNECTIONS = new Map<string, Set<string>>();
