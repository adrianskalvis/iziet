/**
 * Shared data types for the app and the data pipeline.
 * The pipeline writes EventItem[] to static/data/events.json; the app reads it.
 */

export const CATEGORY_IDS = [
	'koncerti',
	'teatris',
	'izstades',
	'festivali',
	'gimenem',
	'ediens',
	'tirdzini',
	'blusu',
	'sports',
	'darbnicas',
	'anime',
	'hobiji'
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type EventStatus = 'cancelled' | 'soldout' | 'postponed';

export interface TicketLink {
	/** Seller display name, for example "Biļešu Serviss". */
	seller: string;
	url: string;
}

export interface SourceRef {
	/** Adapter id, for example "fienta". */
	id: string;
	/** Display name, for example "Fienta". */
	name: string;
	/** Event page at that source. */
	url: string;
}

export interface Price {
	min?: number;
	max?: number;
	free?: boolean;
}

/** One normalised event, as shipped to the app. */
export interface EventItem {
	id: string;
	title: string;
	/** Plain text, at most 280 characters. */
	desc?: string;
	cat: CategoryId;
	/** Niche and genre tags, open list (see TAGS in categories.ts). */
	tags: string[];
	/** ISO 8601 with offset, Europe/Riga local time. */
	start: string;
	end?: string;
	allDay?: boolean;
	/** Further future start times (shows, repeat dates), at most 20. */
	times?: string[];
	venue?: string;
	address?: string;
	/** Display name of the town or city. */
	town: string;
	/** Wikidata id of the town, when known. */
	placeId?: string;
	/** Rīga apkaime id, when the venue is in Rīga. */
	apkaime?: string;
	lat?: number;
	lng?: number;
	/** True when lat/lng is the town centre, not the venue. */
	approx?: boolean;
	price?: Price;
	tickets: TicketLink[];
	/** Main page at the original source. */
	url: string;
	sources: SourceRef[];
	img?: string;
	imgW?: number;
	imgH?: number;
	/** Event language codes: lv, ru, en, ltg. */
	lang?: string[];
	ageMin?: number;
	ageMax?: number;
	family?: boolean;
	adult?: boolean;
	status?: EventStatus;
	/** Editorial or popularity boost, 0 to 1. */
	boost?: number;
	/** Ids of duplicate records merged into this event; saved links to them still resolve. */
	alias?: string[];
}

/** Fields that load only on the event page (static/data/details/<shard>.json). */
export const DETAIL_KEYS = ['desc', 'tickets', 'sources', 'url', 'address', 'imgW', 'imgH', 'lang'] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];

/** List record in static/data/events.json: everything a card, ranking and search need. */
export type EventCore = Omit<EventItem, DetailKey> & {
	/** Number of distinct sources, for tie-breaks. */
	src?: number;
};

export type EventDetail = Pick<EventItem, DetailKey | 'times'>;

export const DETAIL_SHARDS = 16;
/** Times kept in the list file; the rest load with the details. */
export const CORE_TIMES = 3;

/** Detail shard for an event id: stable across pipeline and app. */
export function shardOf(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
	return hash % DETAIL_SHARDS;
}

/** What an adapter returns, before normalisation. */
export interface RawEvent {
	source: string;
	/** Stable id within the source. */
	sourceId: string;
	url: string;
	title: string;
	description?: string;
	/** ISO 8601 with offset. Use rigaIso() for local Latvian times. */
	start: string;
	end?: string;
	allDay?: boolean;
	occurrences?: string[];
	venueName?: string;
	address?: string;
	town?: string;
	lat?: number;
	lng?: number;
	priceMin?: number;
	priceMax?: number;
	free?: boolean;
	tickets?: TicketLink[];
	image?: string;
	imageWidth?: number;
	imageHeight?: number;
	/** Category labels as the source writes them, raw. */
	categoryHint?: string[];
	tags?: string[];
	lang?: string[];
	ageMin?: number;
	ageMax?: number;
	status?: 'scheduled' | EventStatus;
	organizer?: string;
	/** Category set by a person (curated data); skips keyword voting. */
	category?: CategoryId;
	/** Source-level default category when nothing else matches. */
	defaultCategory?: CategoryId;
}

export interface SourceStatus {
	id: string;
	name: string;
	homepage: string;
	state: 'ok' | 'cached' | 'failed' | 'disabled';
	count: number;
	message?: string;
	fetchedAt?: string;
}

export interface DataMeta {
	generatedAt: string;
	count: number;
	sources: SourceStatus[];
}

export type PlaceKind = 'riga' | 'state' | 'town' | 'village';

export interface Place {
	id: string;
	name: string;
	lat: number;
	lng: number;
	kind: PlaceKind;
	pop?: number;
}

export interface Apkaime {
	id: string;
	name: string;
	lat: number;
	lng: number;
	/** Ids of bordering apkaimes. */
	near: string[];
}
