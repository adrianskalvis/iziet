/** Pipeline limits shared by the main run (run.ts) and the relay (relay-run.ts). */

/** Events further ahead than this are not fetched. */
export const HORIZON_DAYS = 120;

/** A failing source falls back to a cached or relayed result younger than this. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 3600_000;
