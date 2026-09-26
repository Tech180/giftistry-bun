export const REALTIME_FANOUT_CHANNEL = 'giftistry_ws_fanout';

/** Stay under Postgres NOTIFY practical limit (~8KB). */
export const REALTIME_FANOUT_MAX_BYTES = 7000;
