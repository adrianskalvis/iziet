import { rigaIso, rigaParts, toRigaIso } from '../../src/lib/shared/time';

/**
 * Date parsing for Latvian sources. Every function returns ISO 8601 strings
 * with the Riga offset, or undefined when the input cannot be read.
 */

/** Month stems in folded form, matching nominative, genitive and locative. */
const MONTH_STEMS: Array<[RegExp, number]> = [
	[/^janv|^janu|^jan\b/, 1],
	[/^febr|^feb\b/, 2],
	[/^mart|^marc|^mar\b/, 3],
	[/^apr/, 4],
	[/^maij|^may/, 5],
	[/^jun|^jūn/, 6],
	[/^jul|^jūl/, 7],
	[/^aug/, 8],
	[/^sept|^sep/, 9],
	[/^okt|^oct/, 10],
	[/^nov/, 11],
	[/^dec/, 12]
];

export function monthFromWord(word: string): number | undefined {
	const folded = word
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z]/g, '');
	for (const [pattern, month] of MONTH_STEMS) if (pattern.test(folded)) return month;
	return undefined;
}

export interface ParsedDate {
	iso: string;
	allDay: boolean;
}

/**
 * Reads ISO-like strings: with offset or Z (converted to Riga time),
 * "YYYY-MM-DD" (all day) or "YYYY-MM-DDTHH:mm[:ss]" (Riga wall clock).
 */
export function parseIsoLoose(value: string | undefined | null): ParsedDate | undefined {
	if (!value) return undefined;
	const text = value.trim();
	const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (dateOnly) return { iso: rigaIso(+dateOnly[1], +dateOnly[2], +dateOnly[3]), allDay: true };
	const local = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
	if (local) return { iso: rigaIso(+local[1], +local[2], +local[3], +local[4], +local[5]), allDay: false };
	const ms = Date.parse(text);
	if (Number.isNaN(ms)) return undefined;
	return { iso: toRigaIso(ms), allDay: false };
}

/** Reads "19.00", "19:00" or "19.00–21.30" (first time only). */
export function parseTime(text: string): { hour: number; minute: number } | undefined {
	const match = text.match(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/);
	return match ? { hour: Number(match[1]), minute: Number(match[2]) } : undefined;
}

/** Picks the year for a day and month without one: the next occurrence from `now`. */
export function inferYear(month: number, day: number, now: Date): number {
	const today = rigaParts(now);
	const candidate = today.year;
	const isPast = month < today.month || (month === today.month && day < today.day - 1);
	return isPast ? candidate + 1 : candidate;
}

/**
 * Reads Latvian date text such as "14. decembris, 19.00", "14. decembrī plkst. 19.00",
 * "14.12.2026 19:00", "2026. gada 14. decembrī" or "Sestdiena, 14. dec.".
 */
export function parseLvDateTime(text: string, now: Date = new Date()): ParsedDate | undefined {
	if (!text) return undefined;
	const clean = text.replace(/\s+/g, ' ').trim();

	const numeric = clean.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
	if (numeric) {
		const day = Number(numeric[1]);
		const month = Number(numeric[2]);
		let year = Number(numeric[3]);
		if (year < 100) year += 2000;
		if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return withTime(year, month, day, clean.slice(numeric.index! + numeric[0].length));
	}

	const worded = clean.match(/\b(\d{1,2})\.\s*([A-Za-zĀ-žā-ž]+)\.?(?:\s+(\d{4}))?/u);
	if (worded) {
		const month = monthFromWord(worded[2]);
		if (month) {
			const day = Number(worded[1]);
			const explicitYear = clean.match(/\b(20\d{2})\.?\s*(?:g\.|gada)?/);
			const year = worded[3] ? Number(worded[3]) : explicitYear ? Number(explicitYear[1]) : inferYear(month, day, now);
			return withTime(year, month, day, clean.slice(worded.index! + worded[0].length));
		}
	}
	return undefined;
}

function withTime(year: number, month: number, day: number, rest: string): ParsedDate {
	const time = parseTime(rest);
	if (!time) return { iso: rigaIso(year, month, day), allDay: true };
	return { iso: rigaIso(year, month, day, time.hour, time.minute), allDay: false };
}
