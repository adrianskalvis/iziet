import MiniSearch from 'minisearch';
import { fold } from '$shared/fold';
import type { EventItem } from '$shared/types';
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

function topics(event: EventItem): string {
	const labels = [t(`cat.${event.cat}`), ...event.tags.map((tag) => (has(`tag.${tag}`) ? t(`tag.${tag}`) : tag))];
	return labels.join(' ');
}

export function buildIndex(events: EventItem[]): MiniSearch<SearchDoc> {
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
			place: [event.venue, event.town, event.address].filter(Boolean).join(' '),
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
