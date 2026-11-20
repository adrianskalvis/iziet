import type { RawEvent } from '../../../src/lib/shared/types';
import { parseIsoLoose } from '../../lib/dates';
import { cheerio, cleanText, truncate } from '../../lib/html';

const MAX_OCCURRENCES = 20;
const DAY_MS = 86_400_000;
const DESCRIPTION_MAX = 600;

/** Show fields the adapters read. Both feeds use the same names. */
export interface CinemaShow {
	id: string;
	eventId: string;
	title: string;
	originalTitle?: string;
	year?: string;
	lengthMinutes?: number;
	ratingLabel?: string;
	eventType?: string;
	genres?: string;
	theatreId: string;
	theatre: string;
	auditorium?: string;
	presentation?: string;
	showUrl?: string;
	eventUrl?: string;
	spoken?: string;
	start: string;
	end?: string;
	imageLandscape?: string;
	imagePortrait?: string;
}

export interface CinemaConfig {
	source: string;
	sellerName: string;
	addresses: Record<string, string>;
}

type Json = Record<string, unknown>;

const text = (value: unknown): string | undefined => {
	const cleaned = typeof value === 'string' || typeof value === 'number' ? cleanText(String(value)) : '';
	return cleaned || undefined;
};

/** Apollo Kino /xml/Schedule: JSON despite the path. */
export function parseApolloSchedule(body: string): CinemaShow[] {
	const data = JSON.parse(body) as { Shows?: Json[] };
	return (data.Shows ?? []).flatMap((raw) => {
		const images = (raw.Images ?? {}) as Json;
		const spoken = (raw.SpokenLanguage ?? {}) as Json;
		const show = toShow({
			id: raw.ID,
			eventId: raw.EventID,
			title: raw.Title,
			originalTitle: raw.OriginalTitle,
			year: raw.ProductionYear,
			length: raw.LengthInMinutes,
			ratingLabel: raw.RatingLabel,
			eventType: raw.EventType,
			genres: raw.Genres,
			theatreId: raw.TheatreID,
			theatre: raw.Theatre,
			auditorium: raw.TheatreAuditorium,
			presentation: raw.PresentationMethod,
			showUrl: raw.ShowURL,
			eventUrl: raw.EventURL,
			spoken: spoken.ISOTwoLetterCode,
			start: raw.dttmShowStart,
			end: raw.dttmShowEnd,
			landscape: images.EventLargeImageLandscape ?? images.EventSmallImageLandscape,
			portrait: images.EventLargeImagePortrait ?? images.EventMediumImagePortrait
		});
		return show ? [show] : [];
	});
}

/** Forum Cinemas /xml/Schedule/: same schema as XML. */
export function parseForumSchedule(body: string): CinemaShow[] {
	const $ = cheerio.load(body, { xmlMode: true });
	const shows: CinemaShow[] = [];
	$('Shows > Show').each((_, element) => {
		const node = $(element);
		const field = (name: string) => node.children(name).first().text();
		const image = (name: string) => node.find(`Images > ${name}`).first().text();
		const show = toShow({
			id: field('ID'),
			eventId: field('EventID'),
			title: field('Title'),
			originalTitle: field('OriginalTitle'),
			year: field('ProductionYear'),
			length: field('LengthInMinutes'),
			ratingLabel: field('RatingLabel'),
			eventType: field('EventType'),
			genres: field('Genres'),
			theatreId: field('TheatreID'),
			theatre: field('Theatre'),
			auditorium: field('TheatreAuditorium'),
			presentation: field('PresentationMethod'),
			showUrl: field('ShowURL'),
			eventUrl: field('EventURL'),
			spoken: node.children('SpokenLanguage').first().children('ISOTwoLetterCode').text(),
			start: field('dttmShowStart'),
			end: field('dttmShowEnd'),
			landscape: image('EventLargeImageLandscape') || image('EventSmallImageLandscape'),
			portrait: image('EventLargeImagePortrait') || image('EventMediumImagePortrait')
		});
		if (show) shows.push(show);
	});
	return shows;
}

function toShow(raw: Record<string, unknown>): CinemaShow | undefined {
	const start = parseIsoLoose(text(raw.start));
	const title = text(raw.title);
	const id = text(raw.id);
	const eventId = text(raw.eventId);
	const theatre = text(raw.theatre);
	if (!start || !title || !id || !eventId || !theatre) return undefined;
	const length = Number(text(raw.length));
	return {
		id,
		eventId,
		title,
		originalTitle: text(raw.originalTitle),
		year: text(raw.year),
		lengthMinutes: Number.isFinite(length) && length > 0 ? length : undefined,
		ratingLabel: text(raw.ratingLabel),
		eventType: text(raw.eventType),
		genres: text(raw.genres),
		theatreId: text(raw.theatreId) ?? theatre,
		theatre,
		auditorium: text(raw.auditorium),
		presentation: text(raw.presentation),
		showUrl: text(raw.showUrl),
		eventUrl: text(raw.eventUrl),
		spoken: text(raw.spoken)?.toLowerCase(),
		start: start.iso,
		end: parseIsoLoose(text(raw.end))?.iso,
		imageLandscape: text(raw.landscape),
		imagePortrait: text(raw.portrait)
	};
}

export function https(url: string | undefined): string | undefined {
	return url?.replace(/^http:\/\//, 'https://');
}

/** "N12" or "12+" gives 12. "U" and unknown labels give undefined. */
export function ageFromRating(label: string | undefined): number | undefined {
	const match = label?.match(/(\d{1,2})/);
	return match ? Number(match[1]) : undefined;
}

/** Sentence case, only when the whole title is upper case. */
export function fixShoutingTitle(title: string): string {
	const letters = title.replace(/[^\p{L}]/gu, '');
	if (letters.length < 4 || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) return title;
	const lower = title.toLowerCase();
	return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** One RawEvent per film per cinema: earliest upcoming show plus later show times. */
export function showsToEvents(shows: CinemaShow[], config: CinemaConfig, now: Date, horizonDays: number): RawEvent[] {
	const latest = now.getTime() + horizonDays * DAY_MS;
	const groups = new Map<string, CinemaShow[]>();
	for (const show of shows) {
		const startMs = Date.parse(show.start);
		if (startMs < now.getTime() || startMs > latest) continue;
		const key = `${show.eventId}-${show.theatreId}`;
		groups.set(key, [...(groups.get(key) ?? []), show]);
	}
	return [...groups.entries()].map(([key, group]) => {
		const ordered = [...group].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
		return toEvent(key, ordered, config);
	});
}

function toEvent(sourceId: string, ordered: CinemaShow[], config: CinemaConfig): RawEvent {
	const first = ordered[0];
	const languages = [...new Set(ordered.map((show) => show.spoken).filter((code): code is string => !!code))];
	const presentations = new Set(ordered.map((show) => show.presentation ?? ''));
	const tags = ['kino'];
	if ([...presentations].some((p) => /imax/i.test(p))) tags.push('imax');
	if ([...presentations].some((p) => /3d/i.test(p))) tags.push('3d');
	const age = ageFromRating(first.ratingLabel);
	const genres = first.genres?.split(',').map((genre) => cleanText(genre)).filter(Boolean) ?? [];
	const description = [
		first.originalTitle && first.originalTitle !== first.title ? `${first.originalTitle}${first.year ? ` (${first.year})` : ''}.` : first.year ? `${first.year}.` : '',
		genres.join(', ') ? `${genres.join(', ')}.` : '',
		first.lengthMinutes ? `${first.lengthMinutes} min.` : ''
	]
		.filter(Boolean)
		.join(' ');
	const showUrl = https(first.showUrl);
	return {
		source: config.source,
		sourceId,
		url: https(first.eventUrl) ?? showUrl ?? '',
		title: fixShoutingTitle(first.title),
		description: description ? truncate(description, DESCRIPTION_MAX) : undefined,
		start: first.start,
		end: first.end,
		occurrences: ordered.slice(1, 1 + MAX_OCCURRENCES).map((show) => show.start),
		venueName: first.theatre,
		address: config.addresses[first.theatre],
		town: 'Rīga',
		tickets: showUrl ? [{ seller: config.sellerName, url: showUrl }] : undefined,
		image: https(first.imageLandscape ?? first.imagePortrait),
		categoryHint: [...genres, ...(first.eventType ? [first.eventType] : [])],
		tags,
		lang: languages.length ? languages : undefined,
		ageMin: age,
		defaultCategory: 'izstades'
	};
}
