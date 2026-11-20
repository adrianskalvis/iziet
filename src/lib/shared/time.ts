/**
 * Europe/Riga time helpers. All event times are stored as ISO 8601 strings
 * with the Riga offset (+02:00 in winter, +03:00 in summer).
 */

export const TZ = 'Europe/Riga';

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: TZ,
	timeZoneName: 'longOffset',
	year: 'numeric'
});

/** Riga UTC offset in minutes at a given instant (120 or 180). */
export function rigaOffsetMinutes(instant: Date): number {
	const part = offsetFormatter.formatToParts(instant).find((p) => p.type === 'timeZoneName');
	const match = part?.value.match(/GMT([+-])(\d{2}):?(\d{2})?/);
	if (!match) return 120;
	const sign = match[1] === '-' ? -1 : 1;
	return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

function pad(n: number, width = 2): string {
	return String(n).padStart(width, '0');
}

function formatOffset(minutes: number): string {
	const sign = minutes < 0 ? '-' : '+';
	const abs = Math.abs(minutes);
	return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Builds an ISO string for a Riga local wall-clock time.
 * Month is 1 to 12. Handles daylight saving changes.
 */
export function rigaIso(year: number, month: number, day: number, hour = 0, minute = 0): string {
	const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
	let offset = rigaOffsetMinutes(new Date(wallAsUtc - 120 * 60_000));
	offset = rigaOffsetMinutes(new Date(wallAsUtc - offset * 60_000));
	return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${formatOffset(offset)}`;
}

/** Converts any instant to an ISO string in Riga local time with offset. */
export function toRigaIso(instant: Date | string | number): string {
	const date = new Date(instant);
	const p = rigaParts(date);
	return rigaIso(p.year, p.month, p.day, p.hour, p.minute);
}

export interface RigaParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	/** 0 = Sunday ... 6 = Saturday. */
	weekday: number;
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	weekday: 'short',
	hourCycle: 'h23'
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts of an instant in Riga. */
export function rigaParts(instant: Date | string | number): RigaParts {
	const parts = partsFormatter.formatToParts(new Date(instant));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
	return {
		year: Number(get('year')),
		month: Number(get('month')),
		day: Number(get('day')),
		hour: Number(get('hour')) % 24,
		minute: Number(get('minute')),
		weekday: WEEKDAYS[get('weekday')] ?? 0
	};
}

/** Riga calendar day as "YYYY-MM-DD". */
export function rigaDayKey(instant: Date | string | number): string {
	const p = rigaParts(instant);
	return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Whole calendar days from `from` to `to` in Riga (0 = same day). */
export function rigaDayDiff(from: Date | string | number, to: Date | string | number): number {
	const a = rigaDayKey(from);
	const b = rigaDayKey(to);
	return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
