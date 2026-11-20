import { eventEndMs } from '$shared/event-time';
import { rigaParts } from '$shared/time';
import type { EventItem } from '$shared/types';

/** Builds an .ics file for "Pievienot kalendāram". Times are written in UTC. */

const DEFAULT_DURATION_MS = 2 * 3600_000;

function utcStamp(ms: number): string {
	return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

/** Folds lines longer than 75 octets, as RFC 5545 requires. */
function fold(line: string): string {
	const chunks: string[] = [];
	let rest = line;
	while (new TextEncoder().encode(rest).length > 74) {
		let cut = 74;
		while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
		chunks.push(rest.slice(0, cut));
		rest = rest.slice(cut);
	}
	chunks.push(rest);
	return chunks.join('\r\n ');
}

/** "20261214" for DTSTART;VALUE=DATE, in Riga local time. */
function dateStamp(ms: number): string {
	const p = rigaParts(ms);
	return `${p.year}${String(p.month).padStart(2, '0')}${String(p.day).padStart(2, '0')}`;
}

export function buildIcs(event: EventItem, now = new Date()): string {
	const start = Date.parse(event.start);
	const endMs = eventEndMs(event);
	// All-day and multi-day events (exhibitions) become date entries; DTEND is the day after the last day.
	const asDates = event.allDay || endMs - start > 86_400_000;
	const timedEnd = event.end ? Date.parse(event.end) : start + DEFAULT_DURATION_MS;
	const when = asDates
		? [`DTSTART;VALUE=DATE:${dateStamp(start)}`, `DTEND;VALUE=DATE:${dateStamp(endMs + 1)}`]
		: [`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(timedEnd)}`];
	const location = [event.venue, event.address, event.town].filter(Boolean).join(', ');
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Iziet//LV',
		'CALSCALE:GREGORIAN',
		'BEGIN:VEVENT',
		`UID:${event.id}@iziet.lv`,
		`DTSTAMP:${utcStamp(now.getTime())}`,
		...when,
		`SUMMARY:${escapeText(event.title)}`,
		location ? `LOCATION:${escapeText(location)}` : '',
		`URL:${event.url}`,
		event.desc ? `DESCRIPTION:${escapeText(`${event.desc}\n${event.url}`)}` : `DESCRIPTION:${escapeText(event.url)}`,
		'END:VEVENT',
		'END:VCALENDAR'
	].filter(Boolean);
	return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(event: EventItem): void {
	const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${event.title.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'pasakums'}.ics`;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
