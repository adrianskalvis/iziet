import { rigaParts } from './time';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const DEFAULT_DURATION_MS = 3 * HOUR_MS;

interface Timed {
	start: string;
	end?: string;
	allDay?: boolean;
}

function isMidnight(ms: number): boolean {
	const p = rigaParts(ms);
	return p.hour === 0 && p.minute === 0;
}

/**
 * When an event is over. All-day events and date-only ends (midnight) last to
 * the end of that day; timed events without an end get 3 hours.
 */
export function eventEndMs(event: Timed): number {
	if (event.end) {
		const end = Date.parse(event.end);
		return isMidnight(end) ? end + DAY_MS - 1 : end;
	}
	const start = Date.parse(event.start);
	return event.allDay || isMidnight(start) ? start + DAY_MS - 1 : start + DEFAULT_DURATION_MS;
}
