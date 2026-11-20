import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaIso, rigaParts } from '../../../src/lib/shared/time';
import { truncate } from '../../lib/html';
import type { CuratedRecord, Recurrence } from './data';

export const SOURCE_ID = 'curated';
export const MAX_OCCURRENCES = 20;
const MS_PER_DAY = 86_400_000;
const DESCRIPTION_MAX = 600;

export interface Occurrence {
	start: string;
	end?: string;
	allDay: boolean;
}

/** "YYYY-MM-DD" -> day number since epoch, so day arithmetic ignores time zones. */
function dayNumber(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function dayKey(day: number): string {
	return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** ISO weekday, 1 = Monday ... 7 = Sunday. */
function isoWeekday(day: number): number {
	const js = new Date(day * MS_PER_DAY).getUTCDay();
	return js === 0 ? 7 : js;
}

function clock(date: string, time: string): string {
	const [y, m, d] = date.split('-').map(Number);
	const [hh, mm] = time.split(':').map(Number);
	return rigaIso(y, m, d, hh, mm);
}

function recurringOccurrences(rule: Recurrence, firstDay: number, lastDay: number): Occurrence[] {
	const from = rule.from ? Math.max(firstDay, dayNumber(rule.from)) : firstDay;
	const to = rule.to ? Math.min(lastDay, dayNumber(rule.to)) : lastDay;
	const excluded = new Set(rule.exclude ?? []);
	const out: Occurrence[] = [];
	for (let day = from; day <= to; day++) {
		const key = dayKey(day);
		if (excluded.has(key)) continue;
		const slot = rule.slots.find((s) => s.weekdays.includes(isoWeekday(day)));
		if (!slot) continue;
		const hours = rule.overrides?.[key] ?? slot;
		out.push({ start: clock(key, hours.start), end: clock(key, hours.end), allDay: false });
	}
	return out;
}

function fixedOccurrences(record: CuratedRecord): Occurrence[] {
	const fixed = record.fixed;
	if (!fixed) return [];
	const last = fixed.to ?? fixed.from;
	if (fixed.startTime) {
		return [{ start: clock(fixed.from, fixed.startTime), end: clock(last, fixed.endTime ?? fixed.startTime), allDay: false }];
	}
	return [{ start: clock(fixed.from, '00:00'), end: clock(last, '23:59'), allDay: true }];
}

/**
 * All occurrences that start within horizonDays calendar days of today (Riga)
 * and have not ended at `now`, in time order.
 */
export function occurrencesFor(record: CuratedRecord, now: Date, horizonDays: number): Occurrence[] {
	const today = rigaParts(now);
	const firstDay = dayNumber(`${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`);
	const lastDay = firstDay + horizonDays;
	const lastKey = dayKey(lastDay);
	const all = record.recurrence ? recurringOccurrences(record.recurrence, firstDay, lastDay) : fixedOccurrences(record);
	return all
		.filter((o) => Date.parse(o.end ?? o.start) >= now.getTime())
		.filter((o) => o.start.slice(0, 10) <= lastKey)
		.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** One RawEvent per record: first occurrence as start, up to 20 more as occurrences. */
export function recordToRaw(record: CuratedRecord, now: Date, horizonDays: number): RawEvent | undefined {
	const [first, ...rest] = occurrencesFor(record, now, horizonDays);
	if (!first) return undefined;
	return {
		source: SOURCE_ID,
		sourceId: record.id,
		url: record.url,
		title: record.title,
		description: truncate(record.description, DESCRIPTION_MAX),
		start: first.start,
		end: first.end,
		allDay: first.allDay || undefined,
		occurrences: rest.length ? rest.slice(0, MAX_OCCURRENCES).map((o) => o.start) : undefined,
		venueName: record.venue,
		address: record.address,
		town: record.town,
		lat: record.lat,
		lng: record.lng,
		priceMin: record.free ? 0 : record.priceMin,
		priceMax: record.free ? 0 : record.priceMax,
		free: record.free,
		tickets: record.tickets,
		tags: record.tags.length ? record.tags : undefined,
		lang: record.lang,
		status: 'scheduled',
		defaultCategory: record.category
	};
}
