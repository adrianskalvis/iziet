import { rigaIso, rigaParts } from '../../../src/lib/shared/time';

const MS_PER_DAY = 86_400_000;
export const MAX_OCCURRENCES = 20;

/** "YYYY-MM-DD" in Riga for the instant `now`. */
export function rigaDate(now: Date): string {
	const p = rigaParts(now);
	return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Adds calendar days to "YYYY-MM-DD". */
export function addDays(date: string, days: number): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" + "HH:MM" to an ISO string with the Riga offset. */
export function clock(date: string, time: string): string {
	const [y, m, d] = date.split('-').map(Number);
	const [hh, mm] = time.split(':').map(Number);
	return rigaIso(y, m, d, hh, mm);
}

export interface Window {
	/** Today in Riga, "YYYY-MM-DD". */
	today: string;
	/** Last day (inclusive) that may start. */
	last: string;
	now: Date;
}

export function windowFor(now: Date, horizonDays: number): Window {
	const today = rigaDate(now);
	return { today, last: addDays(today, horizonDays), now };
}

/** True when an event running from `startIso` to `endIso` has not ended and starts inside the window. */
export function inWindow(window: Window, startIso: string, endIso?: string): boolean {
	if (Date.parse(endIso ?? startIso) < window.now.getTime()) return false;
	return startIso.slice(0, 10) <= window.last;
}

/** Splits ISO starts into the earliest one and up to 20 later ones. */
export function splitOccurrences(starts: string[]): { start: string; occurrences?: string[] } {
	const sorted = [...starts].sort((a, b) => Date.parse(a) - Date.parse(b));
	const [start, ...rest] = sorted;
	return { start, occurrences: rest.length ? rest.slice(0, MAX_OCCURRENCES) : undefined };
}
