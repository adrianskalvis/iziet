import type { EventItem, Price } from '$shared/types';
import { rigaDayDiff, rigaParts, type RigaParts } from '$shared/time';
import { capitalize, list, t } from './i18n';

/**
 * Latvian display formats (research section 6):
 *   time "19.00", single day "14. decembris, 19.00", consecutive days "12.–14. decembris",
 *   long range "1.–31. dec.", cross-month "28. nov. – 3. dec.", open-ended "Līdz 6. decembrim",
 *   price "12 €", "8,50 €", "No 8 €", "Bez maksas", distance "850 m", "2,5 km", "23 km".
 */

const NBSP = ' ';
const EN_DASH = '–';
const LONG_RANGE_DAYS = 7;
const EVENING_HOUR = 17;

const months = () => list('date.months');
const monthsShort = () => list('date.monthsShort');

export function formatTime(iso: string): string {
	const p = rigaParts(iso);
	return `${p.hour}.${String(p.minute).padStart(2, '0')}`;
}

function dayMonth(p: RigaParts, short = false): string {
	return `${p.day}.${NBSP}${(short ? monthsShort() : months())[p.month - 1]}`;
}

/** "Šodien", "Šovakar", "Rīt", "Parīt", "Sestdien" or "14. decembris". */
export function formatDay(iso: string, now: Date, options: { allDay?: boolean } = {}): string {
	const p = rigaParts(iso);
	const diff = rigaDayDiff(now, iso);
	if (diff === 0) return !options.allDay && p.hour >= EVENING_HOUR ? t('date.tonight') : t('date.today');
	if (diff === 1) return t('date.tomorrow');
	if (diff === 2) return t('date.dayAfter');
	if (diff > 2 && diff < 7) return capitalize(list('date.weekdayAdverbs')[p.weekday]);
	return dayMonth(p);
}

/** Date range label for multi-day events, without times. */
export function formatRange(startIso: string, endIso: string, now: Date): string {
	const s = rigaParts(startIso);
	const e = rigaParts(endIso);
	const spanDays = rigaDayDiff(startIso, endIso);
	if (rigaDayDiff(now, startIso) < 0) {
		return t('date.until', { date: `${e.day}.${NBSP}${list('date.monthsDative')[e.month - 1]}` });
	}
	if (s.month === e.month && s.year === e.year) {
		const monthName = spanDays > LONG_RANGE_DAYS ? monthsShort()[s.month - 1] : months()[s.month - 1];
		return `${s.day}.${EN_DASH}${e.day}.${NBSP}${monthName}`;
	}
	return `${dayMonth(s, true)} ${EN_DASH} ${dayMonth(e, true)}`;
}

/** "12., 14. un 16. decembris" for up to three separate days in one month. */
function formatDayList(isos: string[]): string | undefined {
	const parts = isos.map((iso) => rigaParts(iso));
	const sameMonth = parts.every((p) => p.month === parts[0].month && p.year === parts[0].year);
	if (!sameMonth || parts.length > 3) return undefined;
	const days = [...new Set(parts.map((p) => p.day))].sort((a, b) => a - b);
	if (days.length < 2) return undefined;
	const head = days.slice(0, -1).map((d) => `${d}.`).join(', ');
	return `${head} ${t('date.and')} ${days[days.length - 1]}.${NBSP}${months()[parts[0].month - 1]}`;
}

/** Card label: "Šodien, 19.00", "14. decembris, 19.00", "12.–14. decembris", "Līdz 6. decembrim". */
export function formatWhen(event: Pick<EventItem, 'start' | 'end' | 'allDay' | 'times'>, now: Date): string {
	const { start, end, allDay } = event;
	if (end && rigaDayDiff(start, end) >= 1 && !(end && rigaDayDiff(start, end) === 1 && rigaParts(end).hour < 6)) {
		return formatRange(start, end, now);
	}
	const times = [start, ...(event.times ?? [])];
	if (times.length > 1 && rigaDayDiff(times[0], times[times.length - 1]) >= 1) {
		const dayList = formatDayList(times);
		if (dayList) return dayList;
	}
	const day = formatDay(start, now, { allDay });
	return allDay ? day : `${day}, ${formatTime(start)}`;
}

/** Detail label with weekday: "Pirmdiena, 14. decembris, 19.00–21.30". */
export function formatWhenLong(event: Pick<EventItem, 'start' | 'end' | 'allDay'>, now: Date): string {
	const { start, end, allDay } = event;
	if (end && rigaDayDiff(start, end) >= 1) return formatRange(start, end, now);
	const p = rigaParts(start);
	const weekday = capitalize(list('date.weekdays')[p.weekday]);
	const date = `${weekday}, ${dayMonth(p)}`;
	if (allDay) return date;
	const time = end ? `${formatTime(start)}${EN_DASH}${formatTime(end)}` : formatTime(start);
	return `${date}, ${time}`;
}

/** Short label for one extra show time: "Sestd., 5. dec., 19.00". */
export function formatShowTime(iso: string): string {
	const p = rigaParts(iso);
	return `${capitalize(list('date.weekdaysShort')[p.weekday])}, ${dayMonth(p, true)}, ${formatTime(iso)}`;
}

export function formatEuro(amount: number): string {
	const whole = Number.isInteger(amount);
	const number = whole ? String(amount) : amount.toFixed(2).replace('.', ',');
	return `${number}${NBSP}€`;
}

/** Card price: "Bez maksas", "12 €", "No 8 €"; undefined when unknown. */
export function formatPrice(price: Price | undefined): string | undefined {
	if (!price) return undefined;
	if (price.free) return t('price.free');
	if (price.min === undefined) return undefined;
	if (price.max !== undefined && price.max > price.min) return t('price.from', { price: formatEuro(price.min) });
	return formatEuro(price.min);
}

/** Detail price: "8–25 €" when both ends are known. */
export function formatPriceRange(price: Price | undefined): string | undefined {
	if (price && !price.free && price.min !== undefined && price.max !== undefined && price.max > price.min) {
		const min = formatEuro(price.min).replace(`${NBSP}€`, '');
		return `${min}${EN_DASH}${formatEuro(price.max)}`;
	}
	return formatPrice(price);
}

/** "850 m" under 1 km, "2,5 km" under 10 km, then whole kilometres. */
export function formatDistance(km: number): string {
	const metres = Math.max(50, Math.round((km * 1000) / 50) * 50);
	if (metres < 1000) return `${metres}${NBSP}m`;
	if (km < 10) return `${(Math.round(km * 10) / 10).toString().replace('.', ',')}${NBSP}km`;
	return `${Math.round(km)}${NBSP}km`;
}

/** "pirms 5 min", "pirms 3 h", "pirms 2 d." */
export function formatAgo(iso: string, now: Date): string {
	const minutes = Math.max(1, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
	if (minutes < 60) return t('date.ago.minutes', { n: minutes });
	const hours = Math.round(minutes / 60);
	if (hours < 48) return t('date.ago.hours', { n: hours });
	return t('date.ago.days', { n: Math.round(hours / 24) });
}
