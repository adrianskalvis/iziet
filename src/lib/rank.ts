import { TAGS } from '$shared/categories';
import { haversineKm } from '$shared/geo';
import { rigaDayDiff, rigaParts } from '$shared/time';
import type { CategoryId, EventCore, PlaceKind } from '$shared/types';
import { getPlace, KIDS_RANGES, resolveOrigin, type Origin, type Profile } from './profile';

/**
 * Explainable ranking (research section 4):
 * S = 0.30·D + 0.25·I + 0.15·F + 0.15·T + 0.10·P + 0.05·B, every term 0 to 1.
 */

export const WEIGHTS = { D: 0.3, I: 0.25, F: 0.15, T: 0.15, P: 0.1, B: 0.05 } as const;

/** Distance where D falls to 0.5, by area type (km). */
export const D50: Record<PlaceKind, number> = { riga: 4, state: 8, town: 12, village: 20 };
/** "Tuvumā" candidate radius by area type (km). */
export const NEARBY_RADIUS: Record<PlaceKind, number> = { riga: 10, state: 15, town: 25, village: 35 };

const NEARBY_WINDOW_DAYS = 14;
const ELSEWHERE_WINDOW_DAYS = 30;
const NEARBY_HALF_LIFE = 7;
const ELSEWHERE_HALF_LIFE = 14;
const ELSEWHERE_D50 = 120;
const NEARBY_THRESHOLD = 0.5;
const NEAR_YOU_KM = 1.5;
const MMR_LAMBDA = 0.7;
const MMR_POOL = 20;
const LONG_RUNNING_DAYS = 7;
const LESS_FACTOR = 0.6;
const DEFAULT_DURATION_MS = 3 * 3600_000;
const TRAVEL_KM_PER_MIN: Record<number, number> = { 30: 35, 60: 80, 120: 160 };

const TAG_CATEGORY = new Map(TAGS.map((tag) => [tag.id, tag.cat]));

export interface ScoreParts {
	D: number;
	I: number;
	F: number;
	T: number;
	P: number;
	B: number;
}

export interface Label {
	key: string;
	params?: Record<string, string>;
}

export interface Scored {
	event: EventCore;
	score: number;
	parts: ScoreParts;
	km?: number;
	/** Rīga only: 1 own apkaime, 2 bordering apkaime, 3 rest of Rīga. */
	ring?: 1 | 2 | 3;
	/** Tag the user follows that matched, for the reason label. */
	matchedTag?: string;
}

/** True while the event has not ended and is not cancelled. */
export function isActive(event: EventCore, now: Date): boolean {
	if (event.status === 'cancelled') return false;
	const endMs = event.end ? Date.parse(event.end) : Date.parse(event.start) + DEFAULT_DURATION_MS;
	return endMs >= now.getTime();
}

function hasFamily(profile: Profile): boolean {
	return profile.companions.includes('family');
}

/** Hard filters before scoring. */
export function passesHardFilters(event: EventCore, profile: Profile, now: Date): boolean {
	if (!isActive(event, now)) return false;
	if (hasFamily(profile) && event.adult) return false;
	const onlyAdults = profile.companions.length > 0 && !hasFamily(profile);
	if (onlyAdults && event.ageMax !== undefined && event.ageMax <= 12) return false;
	return true;
}

export function eventPoint(event: EventCore): { lat: number; lng: number } | undefined {
	if (event.lat !== undefined && event.lng !== undefined) return { lat: event.lat, lng: event.lng };
	const place = getPlace(event.placeId);
	return place ? { lat: place.lat, lng: place.lng } : undefined;
}

export function distanceKm(origin: Origin, event: EventCore): number | undefined {
	const point = eventPoint(event);
	return point ? haversineKm(origin.point, point) : undefined;
}

export function interestScore(event: EventCore, profile: Profile): { value: number; tag?: string } {
	if (profile.cats.length === 0 && profile.tags.length === 0) return { value: 0.5 };
	const followedTag = event.tags.find((tag) => profile.tags.includes(tag));
	if (followedTag) return { value: 1, tag: followedTag };
	if (profile.cats.includes(event.cat)) return { value: 1 };
	const related = event.tags.some((tag) => {
		const cat = TAG_CATEGORY.get(tag);
		return cat !== undefined && profile.cats.includes(cat);
	});
	return { value: related ? 0.5 : 0 };
}

export function familyScore(event: EventCore, profile: Profile): number {
	if (!hasFamily(profile)) return 0.5;
	const familyEvent = event.family || event.cat === 'gimenem';
	if (event.ageMin === undefined && event.ageMax === undefined) return familyEvent ? 1 : 0.5;
	if (profile.kids.length === 0) return familyEvent ? 1 : 0.5;
	const low = event.ageMin ?? 0;
	const high = event.ageMax ?? 99;
	const inside = profile.kids.filter((kid) => KIDS_RANGES[kid][0] >= low && KIDS_RANGES[kid][1] <= high).length;
	return inside / profile.kids.length;
}

/** Friday from 17.00 to Sunday 23.59, Riga time. */
export function isWeekend(iso: string): boolean {
	const p = rigaParts(iso);
	return p.weekday === 6 || p.weekday === 0 || (p.weekday === 5 && p.hour >= 17);
}

export function dateScore(event: EventCore, now: Date, halfLife: number, profile?: Profile): number {
	const days = Math.max(0, rigaDayDiff(now, event.start));
	const weekendBonus = isWeekend(days === 0 && Date.parse(event.start) < now.getTime() ? now.toISOString() : event.start) ? 0.1 : 0;
	let value = Math.min(1, 0.5 ** (days / halfLife) + weekendBonus);
	if (event.end && rigaDayDiff(event.start, event.end) > LONG_RUNNING_DAYS) value *= 0.8;
	if (profile?.timePref?.length && !fitsTimePref(event.start, profile.timePref)) value *= 0.7;
	return value;
}

function fitsTimePref(iso: string, prefs: NonNullable<Profile['timePref']>): boolean {
	const p = rigaParts(iso);
	if (prefs.includes('saturday') && p.weekday === 6) return true;
	if (prefs.includes('sunday') && p.weekday === 0) return true;
	return prefs.includes('weekday') && p.weekday >= 1 && p.weekday <= 5 && p.hour >= 17;
}

export function priceScore(event: EventCore, profile: Profile): number {
	const price = event.price;
	if (price?.free) return 1;
	if (price?.min === undefined) return 0.5;
	if (profile.priceMax === 0) return 0;
	if (profile.priceMax && price.min > profile.priceMax) return 0.1;
	if (price.min <= 10) return 0.7;
	if (price.min <= 25) return 0.4;
	return 0.2;
}

function decay(km: number, d50: number): number {
	return 1 / (1 + (km / d50) ** 2);
}

function ringOf(origin: Origin, event: EventCore): 1 | 2 | 3 | undefined {
	if (origin.kind !== 'riga' || !event.apkaime) return undefined;
	if (!origin.apkaime) return 3;
	if (event.apkaime === origin.apkaime.id) return 1;
	return origin.apkaime.near.includes(event.apkaime) ? 2 : 3;
}

export function scoreEvent(
	event: EventCore,
	profile: Profile,
	origin: Origin,
	now: Date,
	mode: 'nearby' | 'elsewhere' = 'nearby'
): Scored {
	const km = distanceKm(origin, event);
	const ring = ringOf(origin, event);
	const B = Math.min(1, Math.max(0, event.boost ?? 0));
	const d50 = (mode === 'nearby' ? D50[origin.kind] : ELSEWHERE_D50) * (1 + 0.4 * B);
	const D = ring === 1 ? 1 : km === undefined ? 0.3 : decay(km, d50);
	const interest = interestScore(event, profile);
	const parts: ScoreParts = {
		D,
		I: interest.value,
		F: familyScore(event, profile),
		T: dateScore(event, now, mode === 'nearby' ? NEARBY_HALF_LIFE : ELSEWHERE_HALF_LIFE, profile),
		P: priceScore(event, profile),
		B
	};
	let score =
		WEIGHTS.D * parts.D + WEIGHTS.I * parts.I + WEIGHTS.F * parts.F + WEIGHTS.T * parts.T + WEIGHTS.P * parts.P + WEIGHTS.B * parts.B;
	if (profile.less.includes(event.cat)) score *= LESS_FACTOR;
	return { event, score: Math.round(score * 1000) / 1000, parts, km, ring, matchedTag: interest.tag };
}

/** Score desc, then earlier start, shorter distance, more sources, lower id. */
export function compareScored(a: Scored, b: Scored): number {
	return (
		b.score - a.score ||
		Date.parse(a.event.start) - Date.parse(b.event.start) ||
		(a.km ?? 1e9) - (b.km ?? 1e9) ||
		(b.event.src ?? 1) - (a.event.src ?? 1) ||
		a.event.id.localeCompare(b.event.id)
	);
}

type Similarity = (a: Scored, b: Scored) => number;

const sameKind: Similarity = (a, b) =>
	a.event.cat === b.event.cat || (!!a.event.venue && a.event.venue === b.event.venue) ? 1 : 0;

const sameKindOrTown: Similarity = (a, b) => Math.min(1, sameKind(a, b) + (a.event.town === b.event.town ? 0.5 : 0));

/** Greedy Maximal Marginal Relevance over the top of a sorted list. */
export function mmr(sorted: Scored[], count: number, similarity: Similarity = sameKind, lambda = MMR_LAMBDA): Scored[] {
	const pool = sorted.slice(0, MMR_POOL);
	const picked: Scored[] = [];
	while (picked.length < count && pool.length > 0) {
		let bestIndex = 0;
		let bestValue = -Infinity;
		pool.forEach((candidate, index) => {
			const maxSim = picked.reduce((max, item) => Math.max(max, similarity(candidate, item)), 0);
			const value = lambda * candidate.score - (1 - lambda) * maxSim;
			if (value > bestValue) {
				bestValue = value;
				bestIndex = index;
			}
		});
		picked.push(pool.splice(bestIndex, 1)[0]);
	}
	return picked;
}

function withinDays(event: EventCore, now: Date, days: number): boolean {
	return rigaDayDiff(now, event.start) <= days;
}

export interface NearbyResult {
	origin: Origin;
	picks: Scored[];
	radiusKm: number;
	widened: boolean;
	/** Set when nothing qualifies nearby: the closest town that has a fitting event. */
	nearestTown?: { name: string; placeId?: string; km: number };
}

export function pickNearby(events: EventCore[], profile: Profile, now: Date, count = 3): NearbyResult {
	const origin = resolveOrigin(profile);
	const baseRadius = NEARBY_RADIUS[origin.kind];
	const scored = events
		.filter((event) => passesHardFilters(event, profile, now) && withinDays(event, now, NEARBY_WINDOW_DAYS))
		.map((event) => scoreEvent(event, profile, origin, now, 'nearby'));

	for (const [radiusKm, widened] of [
		[baseRadius, false],
		[baseRadius * 2, true]
	] as const) {
		const qualifying = scored
			.filter((item) => item.km !== undefined && item.km <= radiusKm && item.score >= NEARBY_THRESHOLD)
			.sort(compareScored);
		if (qualifying.length === 0) continue;
		const picks: Scored[] = [];
		for (const ring of [1, 2, 3, undefined] as const) {
			if (picks.length >= count) break;
			const inRing = qualifying.filter((item) => item.ring === ring && !picks.includes(item));
			picks.push(...mmr(inRing, count - picks.length));
		}
		return { origin, picks, radiusKm, widened };
	}

	const fitting = scored
		.filter((item) => item.km !== undefined && item.parts.I >= 0.5 && item.score >= NEARBY_THRESHOLD - 0.15)
		.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
	const closest = fitting[0];
	return {
		origin,
		picks: [],
		radiusKm: baseRadius * 2,
		widened: true,
		nearestTown: closest ? { name: closest.event.town, placeId: closest.event.placeId, km: closest.km! } : undefined
	};
}

export function pickElsewhere(
	events: EventCore[],
	profile: Profile,
	now: Date,
	nearbyRadiusKm: number,
	count = 3
): Scored[] {
	const origin = resolveOrigin(profile);
	const maxKm = profile.maxTravelMin ? TRAVEL_KM_PER_MIN[profile.maxTravelMin] : Infinity;
	const hasInterests = profile.cats.length > 0 || profile.tags.length > 0;
	const candidates = events
		.filter((event) => passesHardFilters(event, profile, now) && withinDays(event, now, ELSEWHERE_WINDOW_DAYS))
		.map((event) => scoreEvent(event, profile, origin, now, 'elsewhere'))
		.filter((item) => item.km !== undefined && item.km > nearbyRadiusKm && item.km <= maxKm)
		.filter((item) => !hasInterests || item.parts.I === 1 || (hasFamily(profile) && item.parts.F === 1))
		.sort(compareScored);
	const picks: Scored[] = [];
	for (const item of mmr(candidates, candidates.length, sameKindOrTown)) {
		if (picks.some((picked) => picked.event.town === item.event.town)) continue;
		picks.push(item);
		if (picks.length === count) break;
	}
	return picks;
}

export type When = 'today' | 'tomorrow' | 'weekend' | 'week' | 'any';

export interface ListOptions {
	scope: 'nearby' | 'elsewhere' | 'all';
	cat?: CategoryId;
	tag?: string;
	when?: When;
	free?: boolean;
	family?: boolean;
	placeId?: string;
	sort?: 'best' | 'soon' | 'near';
}

function matchesWhen(event: EventCore, when: When, now: Date): boolean {
	if (when === 'any') return true;
	const startDiff = rigaDayDiff(now, event.start);
	const endDiff = event.end ? rigaDayDiff(now, event.end) : startDiff;
	const overlaps = (from: number, to: number) => startDiff <= to && endDiff >= from;
	if (when === 'today') return overlaps(0, 0);
	if (when === 'tomorrow') return overlaps(1, 1);
	if (when === 'week') return overlaps(0, 6);
	const weekday = rigaParts(now).weekday;
	const toFriday = (5 - weekday + 7) % 7;
	const fromDay = weekday === 6 || weekday === 0 ? 0 : toFriday;
	const toDay = weekday === 0 ? 0 : weekday === 6 ? 1 : toFriday + 2;
	return overlaps(fromDay, toDay);
}

/** Full filtered and sorted list for the "Rādīt vairāk" pages and category pages. */
export function listEvents(events: EventCore[], profile: Profile, now: Date, options: ListOptions): Scored[] {
	const origin = resolveOrigin(profile);
	const radius = NEARBY_RADIUS[origin.kind] * 2;
	const items = events
		.filter((event) => passesHardFilters(event, profile, now))
		.filter((event) => !options.cat || event.cat === options.cat)
		.filter((event) => !options.tag || event.tags.includes(options.tag))
		.filter((event) => !options.free || !!event.price?.free)
		.filter((event) => !options.family || !!event.family || event.cat === 'gimenem')
		.filter((event) => !options.placeId || event.placeId === options.placeId)
		.filter((event) => matchesWhen(event, options.when ?? 'any', now))
		.map((event) => scoreEvent(event, profile, origin, now, options.scope === 'elsewhere' ? 'elsewhere' : 'nearby'))
		.filter((item) => {
			if (options.placeId || options.scope === 'all') return true;
			if (item.km === undefined) return false;
			return options.scope === 'nearby' ? item.km <= radius : item.km > NEARBY_RADIUS[origin.kind];
		});
	const sort = options.sort ?? 'best';
	if (sort === 'soon') return items.sort((a, b) => Date.parse(a.event.start) - Date.parse(b.event.start) || compareScored(a, b));
	if (sort === 'near') return items.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9) || compareScored(a, b));
	return items.sort(compareScored);
}

/**
 * Up to two reason labels (research 4.4), as translation keys.
 * Personal reasons first; a time fact only when no personal reason applies.
 */
export function reasonLabels(item: Scored, profile: Profile, now: Date): Label[] {
	const personal: Array<{ label: Label; weight: number }> = [];
	if (item.ring === 1 || (item.km !== undefined && item.km <= NEAR_YOU_KM)) {
		personal.push({ label: { key: 'reason.nearYou' }, weight: WEIGHTS.D * item.parts.D });
	}
	if (item.parts.I === 1 && (profile.cats.length || profile.tags.length)) {
		const label: Label = item.matchedTag
			? { key: 'reason.likes.tag', params: { tag: `tag.${item.matchedTag}` } }
			: { key: `reason.likes.${item.event.cat}` };
		personal.push({ label, weight: WEIGHTS.I });
	}
	if (hasFamily(profile) && item.parts.F === 1) personal.push({ label: { key: 'reason.family' }, weight: WEIGHTS.F });
	personal.sort((a, b) => b.weight - a.weight);
	const labels = personal.slice(0, 2).map((entry) => entry.label);
	if (labels.length > 0) return labels;

	const p = rigaParts(item.event.start);
	const diff = rigaDayDiff(now, item.event.start);
	if (diff === 0) return [{ key: p.hour >= 17 ? 'reason.tonight' : 'reason.today' }];
	if (diff === 1) return [{ key: 'reason.tomorrow' }];
	if (diff < 7 && isWeekend(item.event.start)) return [{ key: 'reason.weekend' }];
	return [];
}
