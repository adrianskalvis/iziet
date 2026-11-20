import { describe, expect, test } from 'vitest';
import { rigaDayDiff, rigaIso, rigaParts } from './time';

const intl = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/Riga',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	weekday: 'short',
	hourCycle: 'h23'
});
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function intlParts(ms: number) {
	const parts = intl.formatToParts(new Date(ms));
	const get = (type: string) => parts.find((p) => p.type === type)!.value;
	return {
		year: Number(get('year')),
		month: Number(get('month')),
		day: Number(get('day')),
		hour: Number(get('hour')),
		minute: Number(get('minute')),
		weekday: WEEKDAYS[get('weekday')]
	};
}

describe('fast Riga time', () => {
	test('matches Intl every 37 minutes from 2025 to 2030, across every DST change', () => {
		const start = Date.UTC(2025, 0, 1);
		const end = Date.UTC(2030, 11, 31);
		for (let ms = start; ms < end; ms += 37 * 60_000) {
			expect(rigaParts(ms), new Date(ms).toISOString()).toEqual(intlParts(ms));
		}
	});

	test('builds the right offset on both sides of the March and October changes', () => {
		expect(rigaIso(2026, 3, 29, 2, 59)).toBe('2026-03-29T02:59:00+02:00');
		expect(rigaIso(2026, 3, 29, 4, 0)).toBe('2026-03-29T04:00:00+03:00');
		expect(rigaIso(2026, 10, 25, 2, 0)).toBe('2026-10-25T02:00:00+03:00');
		expect(rigaIso(2026, 10, 25, 5, 0)).toBe('2026-10-25T05:00:00+02:00');
	});

	test('counts calendar days across a DST change', () => {
		expect(rigaDayDiff('2026-10-24T23:30:00+03:00', '2026-10-25T23:30:00+02:00')).toBe(1);
	});
});
