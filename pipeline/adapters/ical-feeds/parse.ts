import type { CategoryId, RawEvent } from '../../../src/lib/shared/types';
import { absoluteUrl } from '../../lib/html';
import { type IcsEvent, parseIcs } from '../../lib/ics';
import { cleanDescription, defined, priceFromText, statusFromTitle } from '../jsonld-sites/common';

export interface IcalSite {
	id: string;
	name: string;
	homepage: string;
	/** Feed URL. */
	feedUrl: string;
	/** Town used when the event has no usable location. */
	town: string;
	/** Read the town from LOCATION (Events Manager writes "Venue, street, town, municipality, Latvia"). */
	townFromLocation?: boolean;
	defaultCategory?: CategoryId;
	lang?: string[];
	keepUpper?: string[];
	maxSpanDays?: number;
}

const DAY_MS = 86_400_000;
const CYRILLIC = /[Ѐ-ӿ]/;

/** Events Manager breaks CATEGORIES lines inside a phrase. Restores the space the unfolding removes. */
export function fixCategoryFolds(text: string): string {
	return text.replace(/^CATEGORIES:.*(?:\r?\n[ \t].*)*/gm, (block) => block.replace(/\r?\n[ \t]/g, '\n  '));
}

/** ATTACH image URLs by event UID. The shared reader skips ATTACH. */
export function readAttachments(text: string): Map<string, string> {
	const images = new Map<string, string>();
	const unfolded = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '');
	for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
		const uid = block.match(/^UID:(.+)$/m)?.[1]?.trim();
		const image = block.match(/^ATTACH[^:\n]*:(https?:\/\/.+)$/m)?.[1]?.trim();
		if (uid && image) images.set(uid, image);
	}
	return images;
}

const LOCATION_NOISE = /^(latvia|latvija|lv-\d{4})$/i;
const REGION = /(novads|pagasts|apriņķis)$/i;
const STREET = /\b(iela|ielā|prospekts|bulvāris|laukums|šoseja|gatve)\b|\d/i;

/** Splits "Venue, street, town, municipality, LV-2160, Latvia" into venue, address and town. */
export function parseLocation(location: string | undefined, fallbackTown: string, townFromLocation: boolean) {
	const parts = (location ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part && !LOCATION_NOISE.test(part));
	if (parts.length === 0) return { town: fallbackTown };
	const [venueName, ...rest] = parts;
	const place = townFromLocation ? [...rest].reverse().find((part) => !REGION.test(part) && !STREET.test(part)) : undefined;
	return {
		venueName,
		address: rest.length ? rest.join(', ') : undefined,
		town: place ?? fallbackTown
	};
}

/**
 * parseIcs already turns the exclusive all-day DTEND into the last day at 23.59.
 * Returns that end for multi-day events, or undefined for one-day events.
 */
function allDayEnd(start: string, end: string): string | undefined {
	const days = Math.round((Date.parse(end) + 60_000 - Date.parse(start)) / DAY_MS);
	return days > 1 ? end : undefined;
}

function mapEvent(event: IcsEvent, site: IcalSite, images: Map<string, string>, duplicateUids: Set<string>): RawEvent | undefined {
	if (!event.summary || !event.start) return undefined;
	const start = event.start.iso;
	const end = event.end ? (event.start.allDay && event.end.allDay ? allDayEnd(start, event.end.iso) : event.end.iso) : undefined;
	const url = absoluteUrl(event.url, site.homepage) ?? site.homepage;
	const place = parseLocation(event.location, site.town, !!site.townFromLocation);
	const description = cleanDescription(event.description);
	const price = priceFromText(event.description);
	const base = event.uid ?? url;
	const status = event.status === 'CANCELLED' ? 'cancelled' : statusFromTitle(event.summary);
	return {
		source: site.id,
		sourceId: duplicateUids.has(base) ? `${base}#${start}` : base,
		url,
		title: event.summary,
		description,
		start,
		end,
		allDay: event.start.allDay || undefined,
		...place,
		lat: event.lat,
		lng: event.lng,
		image: event.uid ? images.get(event.uid) : undefined,
		categoryHint: event.categories,
		lang: CYRILLIC.test(event.summary) ? ['ru'] : undefined,
		status,
		...defined(price ?? {})
	};
}

/** Maps every VEVENT of an iCalendar feed to a RawEvent. No date filtering. */
export function parseIcalFeed(text: string, site: IcalSite): RawEvent[] {
	const events = parseIcs(fixCategoryFolds(text));
	const images = readAttachments(text);
	const counts = new Map<string, number>();
	for (const event of events) if (event.uid) counts.set(event.uid, (counts.get(event.uid) ?? 0) + 1);
	const duplicateUids = new Set([...counts].filter(([, count]) => count > 1).map(([uid]) => uid));
	return events.map((event) => mapEvent(event, site, images, duplicateUids)).filter((event): event is RawEvent => !!event);
}
