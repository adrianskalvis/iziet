import { rigaIso, toRigaIso } from '../../src/lib/shared/time';

/**
 * Minimal iCalendar (RFC 5545) reader for VEVENT blocks. Handles line folding,
 * text escapes, all-day dates, UTC times and local or Europe/Riga times.
 * RRULE is ignored: only the first occurrence is used.
 */

export interface IcsEvent {
	uid?: string;
	summary?: string;
	description?: string;
	location?: string;
	url?: string;
	start?: { iso: string; allDay: boolean };
	end?: { iso: string; allDay: boolean };
	lat?: number;
	lng?: number;
	status?: string;
	categories?: string[];
	image?: string;
}

function unfold(text: string): string[] {
	return text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function unescapeText(value: string): string {
	return value.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();
}

/** Reads DTSTART-like values: 20261214, 20261214T190000, 20261214T170000Z. */
export function parseIcsDate(value: string, params: string): { iso: string; allDay: boolean } | undefined {
	const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
	if (!match) return undefined;
	const [, y, m, d, hh, mm, , zulu] = match;
	if (!hh || /VALUE=DATE(?!-)/i.test(params)) return { iso: rigaIso(+y, +m, +d), allDay: true };
	if (zulu) return { iso: toRigaIso(Date.UTC(+y, +m - 1, +d, +hh, +mm)), allDay: false };
	// TZID other than Riga is rare in Latvian feeds; treat floating and Riga times as Riga wall clock.
	return { iso: rigaIso(+y, +m, +d, +hh, +mm), allDay: false };
}

export function parseIcs(text: string): IcsEvent[] {
	const events: IcsEvent[] = [];
	let current: IcsEvent | undefined;
	for (const line of unfold(text)) {
		if (line === 'BEGIN:VEVENT') {
			current = {};
			continue;
		}
		if (line === 'END:VEVENT') {
			if (current) events.push(current);
			current = undefined;
			continue;
		}
		if (!current) continue;
		const colon = line.indexOf(':');
		if (colon < 0) continue;
		const head = line.slice(0, colon);
		const value = line.slice(colon + 1);
		const [name, ...paramParts] = head.split(';');
		const params = paramParts.join(';');
		switch (name.toUpperCase()) {
			case 'UID':
				current.uid = value.trim();
				break;
			case 'SUMMARY':
				current.summary = unescapeText(value);
				break;
			case 'DESCRIPTION':
				current.description = unescapeText(value);
				break;
			case 'LOCATION':
				current.location = unescapeText(value);
				break;
			case 'URL':
				current.url = value.trim();
				break;
			case 'DTSTART':
				current.start = parseIcsDate(value, params);
				break;
			case 'DTEND': {
				const end = parseIcsDate(value, params);
				// All-day DTEND is exclusive in RFC 5545: the event ends the day before.
				current.end = end?.allDay ? { iso: toRigaIso(Date.parse(end.iso) - 60_000), allDay: true } : end;
				break;
			}
			case 'ATTACH':
				if (/^https?:\/\/.+\.(jpe?g|png|webp|avif)(\?|$)/i.test(value.trim())) current.image = value.trim();
				break;
			case 'GEO': {
				const [lat, lng] = value.split(/[;,]/).map(Number);
				if (Number.isFinite(lat) && Number.isFinite(lng)) Object.assign(current, { lat, lng });
				break;
			}
			case 'STATUS':
				current.status = value.trim().toUpperCase();
				break;
			case 'CATEGORIES':
				current.categories = unescapeText(value)
					.split(',')
					.map((c) => c.trim())
					.filter(Boolean);
				break;
		}
	}
	return events;
}
