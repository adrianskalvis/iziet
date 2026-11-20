/** Pipeline limits shared by the main run (run.ts) and the relay (relay-run.ts). */

/** Events further ahead than this are not fetched. */
export const HORIZON_DAYS = 120;

/** A failing source falls back to its own cached result when that is younger than this. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 3600_000;

/**
 * A relay file stays usable this long, so a computer that is off for a few
 * weeks does not empty its sources. Past events drop out on every run anyway.
 */
export const RELAY_MAX_AGE_MS = 30 * 24 * 3600_000;

/** The health issue lists a source with no fresh events for this many days. */
export const STALE_AFTER_DAYS = 3;

/** Relay sources are refreshed from the owner's computer, so they get more slack. */
export const RELAY_STALE_AFTER_DAYS = 10;

/** A source quiet for longer than this is treated as seasonal and leaves the health issue. */
export const FORGET_AFTER_DAYS = 45;
