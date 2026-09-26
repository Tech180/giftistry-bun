export interface CreateAppContainerOptions {
  /**
   * When true, job runners do not call NotifyItemJobCompletion (worker role).
   * The API process handles notify after LISTEN fanout with real WS presence.
   */
  skipItemJobCompletionNotify?: boolean;
}
