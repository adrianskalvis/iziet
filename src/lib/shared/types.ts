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
