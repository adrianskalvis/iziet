import MiniSearch from 'minisearch';
import { fold } from '$shared/fold';
import type { EventCore } from '$shared/types';
import { has, t } from './i18n';

/**
 * Client-side search (research 4.7): MiniSearch with Latvian diacritic folding,
 * prefix from 2 letters and fuzzy matching from 4 letters. "riga" finds "Rīga".
 */

interface SearchDoc {
	id: string;
	title: string;
	place: string;
	topics: string;
}

/**
 * Words a search may use for the event's kind. "Izstādes un kino" is one
 * category of two kinds, so a film is indexed as a film and an exhibition as
 * an exhibition; otherwise "foto izstāde" would return cinema showings.
 */
function topics(event: EventCore): string {
	const isFilm = event.tags.includes('kino');
	const kind = event.cat !== 'izstades' ? t(`cat.${event.cat}`) : isFilm ? 'kino filma filmas seanss' : 'izstāde izstādes';
	return [kind, ...event.tags.map((tag) => (has(`tag.${tag}`) ? t(`tag.${tag}`) : tag))].join(' ');
}

const TOWN_WORD_MIN = 4;

/**
 * True when the query names the event's town: a query word of 4 letters or more
 * starts the town name, ignoring diacritics and the last letter (Jūrmalā, Cēsīs).
 * Search then shows that town even when it lies outside "Tuvumā".
 */
export function namesTown(query: string, town: string): boolean {
	const foldedTown = fold(town);
	return fold(query)
		.split(/\s+/)
		.some((word) => word.length >= TOWN_WORD_MIN && foldedTown.length - word.length <= 1 && foldedTown.startsWith(word.slice(0, -1)));
}

export function buildIndex(events: EventCore[]): MiniSearch<SearchDoc> {
	const index = new MiniSearch<SearchDoc>({
		fields: ['title', 'place', 'topics'],
		storeFields: ['id'],
		processTerm: (term) => fold(term),
		searchOptions: {
			prefix: (term) => term.length >= 2,
			fuzzy: (term) => (term.length >= 4 ? 0.2 : false),
			boost: { title: 2, topics: 1.2 },
			combineWith: 'AND'
		}
	});
	index.addAll(
		events.map((event) => ({
			id: event.id,
			title: event.title,
			place: [event.venue, event.town].filter(Boolean).join(' '),
			topics: topics(event)
		}))
	);
	return index;
}

/** Event ids ranked by relevance. Falls back to OR matching when AND finds nothing. */
export function searchIds(index: MiniSearch<SearchDoc>, query: string): string[] {
	const q = query.trim();
	if (q.length < 2) return [];
	let results = index.search(q);
	if (results.length === 0 && q.includes(' ')) results = index.search(q, { combineWith: 'OR' });
	return results.map((result) => String(result.id));
}
