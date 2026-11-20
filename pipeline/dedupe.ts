import { fold } from '../src/lib/shared/fold';
import { haversineKm } from '../src/lib/shared/geo';
import { rigaDayKey } from '../src/lib/shared/time';
import type { EventItem } from '../src/lib/shared/types';

/**
 * Deduplication (research 4.8): block on same local date, nearby venue and
 * start within 30 minutes, then merge on title trigram similarity ≥ 0.5 or a
 * full distinctive-token match, unless both titles keep a long unmatched token.
 */

const GENERIC = new Set(['koncerts', 'koncerta', 'izrade', 'izstade', 'festivals', 'un', 'ar', 'the', 'and', 'live', 'riga', 'riga', 'pasakums', 'concert']);
const VENUE_KM = 0.2;
const START_MS = 30 * 60_000;
const TRIGRAM_MERGE = 0.5;
const TOKEN_JW = 0.9;
const VETO_LENGTH = 5;

/** Aggregators rank below organisers, venues and ticket sellers when fields conflict. */
const AGGREGATORS = new Set(['liveriga', 'latvia-travel', 'fienta', 'curated']);

function tokens(title: string): string[] {
	return fold(title)
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.split(' ')
		.filter((word) => word.length > 1 && !GENERIC.has(word));
}

function trigrams(text: string): Set<string> {
	const padded = `  ${fold(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
	const grams = new Set<string>();
	for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
	return grams;
}

export function trigramSimilarity(a: string, b: string): number {
	const ga = trigrams(a);
	const gb = trigrams(b);
	let shared = 0;
	for (const gram of ga) if (gb.has(gram)) shared++;
	return shared / (ga.size + gb.size - shared || 1);
}

export function jaroWinkler(a: string, b: string): number {
	if (a === b) return 1;
	const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
	const aMatch = new Array<boolean>(a.length).fill(false);
	const bMatch = new Array<boolean>(b.length).fill(false);
	let matches = 0;
	for (let i = 0; i < a.length; i++) {
		for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
			if (bMatch[j] || a[i] !== b[j]) continue;
			aMatch[i] = bMatch[j] = true;
			matches++;
			break;
		}
	}
	if (matches === 0) return 0;
	let transpositions = 0;
	for (let i = 0, k = 0; i < a.length; i++) {
		if (!aMatch[i]) continue;
		while (!bMatch[k]) k++;
		if (a[i] !== b[k]) transpositions++;
		k++;
	}
	const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
	let prefix = 0;
	while (prefix < 4 && a[prefix] && a[prefix] === b[prefix]) prefix++;
	return jaro + prefix * 0.1 * (1 - jaro);
}

function unmatchedLong(source: string[], other: string[]): string[] {
	return source.filter((token) => token.length >= VETO_LENGTH && !other.some((o) => jaroWinkler(token, o) >= TOKEN_JW));
}

export function sameTitle(a: string, b: string): boolean {
	const ta = tokens(a);
	const tb = tokens(b);
	if (unmatchedLong(ta, tb).length > 0 && unmatchedLong(tb, ta).length > 0) return false;
	if (trigramSimilarity(a, b) >= TRIGRAM_MERGE) return true;
	const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
	return shorter.length > 0 && shorter.every((token) => longer.some((other) => jaroWinkler(token, other) >= TOKEN_JW));
}

function sameSlot(a: EventItem, b: EventItem): boolean {
	if (rigaDayKey(a.start) !== rigaDayKey(b.start)) return false;
	const aTimed = !a.allDay;
	const bTimed = !b.allDay;
	if (aTimed && bTimed && Math.abs(Date.parse(a.start) - Date.parse(b.start)) > START_MS) return false;
	const precise = !a.approx && !b.approx;
	if (precise && a.lat !== undefined && b.lat !== undefined && a.lng !== undefined && b.lng !== undefined && a.venue && b.venue) {
		if (haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }) <= VENUE_KM) return true;
	}
	if (a.town !== b.town) return false;
	if (!a.venue || !b.venue) return true;
	return trigramSimilarity(a.venue, b.venue) >= 0.7 || a.venue.includes(b.venue) || b.venue.includes(a.venue);
}

function priority(event: EventItem): number {
	return event.sources.some((s) => !AGGREGATORS.has(s.id)) ? 2 : 1;
}

function mergeInto(primary: EventItem, other: EventItem): EventItem {
	const tickets = [...new Map([...primary.tickets, ...other.tickets].map((t) => [t.url, t])).values()];
	const sources = [...new Map([...primary.sources, ...other.sources].map((s) => [`${s.id}|${s.url}`, s])).values()];
	const times = [...new Set([...(primary.times ?? []), ...(other.times ?? [])])].sort().slice(0, 20);
	const prices = [primary.price, other.price].filter((p) => !!p);
	const paid = prices.filter((p) => !p!.free && p!.min !== undefined);
	const price =
		prices.length === 0
			? undefined
			: prices.every((p) => p!.free)
				? { free: true }
				: paid.length
					? {
							min: Math.min(...paid.map((p) => p!.min!)),
							...(Math.max(...paid.map((p) => p!.max ?? p!.min!)) > Math.min(...paid.map((p) => p!.min!))
								? { max: Math.max(...paid.map((p) => p!.max ?? p!.min!)) }
								: {})
						}
					: primary.price;
	return {
		...other,
		...primary,
		desc: primary.desc ?? other.desc,
		img: primary.img ?? other.img,
		venue: primary.venue ?? other.venue,
		address: primary.address ?? other.address,
		lat: primary.lat ?? other.lat,
		lng: primary.lng ?? other.lng,
		lang: primary.lang ?? other.lang,
		tags: [...new Set([...primary.tags, ...other.tags])],
		family: primary.family || other.family || undefined,
		tickets,
		sources,
		...(times.length ? { times } : {}),
		...(price ? { price } : {})
	};
}

/** Returns merged events; each keeps every source and ticket link. */
export function dedupe(events: EventItem[]): { events: EventItem[]; merged: number } {
	const byDay = new Map<string, EventItem[]>();
	for (const event of events) {
		const key = rigaDayKey(event.start);
		byDay.set(key, [...(byDay.get(key) ?? []), event]);
	}
	const parent = new Map<string, string>(events.map((e) => [e.id, e.id]));
	const find = (id: string): string => {
		let root = id;
		while (parent.get(root) !== root) root = parent.get(root)!;
		parent.set(id, root);
		return root;
	};
	for (const group of byDay.values()) {
		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				const a = group[i];
				const b = group[j];
				if (a.sources[0].id === b.sources[0].id && a.url === b.url && a.start === b.start) {
					parent.set(find(b.id), find(a.id));
					continue;
				}
				if (sameSlot(a, b) && sameTitle(a.title, b.title)) parent.set(find(b.id), find(a.id));
			}
		}
	}
	const clusters = new Map<string, EventItem[]>();
	for (const event of events) {
		const root = find(event.id);
		clusters.set(root, [...(clusters.get(root) ?? []), event]);
	}
	const result: EventItem[] = [];
	for (const members of clusters.values()) {
		const sorted = [...members].sort((a, b) => priority(b) - priority(a) || (b.desc?.length ?? 0) - (a.desc?.length ?? 0));
		let merged = sorted[0];
		for (const other of sorted.slice(1)) merged = mergeInto(merged, other);
		const distinctSources = new Set(merged.sources.map((s) => s.id)).size;
		const boost = Math.min(1, (distinctSources - 1) / 3);
		// The smallest member id is the cluster id; the others stay as aliases so saved links keep working.
		const ids = [...new Set(members.map((m) => m.id))].sort();
		const withIds = { ...merged, id: ids[0], ...(ids.length > 1 ? { alias: ids.slice(1) } : {}) };
		result.push(boost > 0 ? { ...withIds, boost: Math.round(boost * 100) / 100 } : withIds);
	}
	return { events: result, merged: events.length - result.length };
}
