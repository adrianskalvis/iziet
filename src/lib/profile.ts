import { APKAIMES, PLACES } from '$shared/places.generated';
import { CATEGORY_IDS, type Apkaime, type CategoryId, type Place, type PlaceKind } from '$shared/types';
import { haversineKm, nearest, type LatLng } from '$shared/geo';

/**
 * The user's profile, stored only in this browser (localStorage).
 * Every field is optional in practice: skipping onboarding leaves defaults.
 */

export type Companion = 'alone' | 'friends' | 'family';
export type KidsAge = '0-6' | '7-12' | '13-17';
export type TimePref = 'weekday' | 'saturday' | 'sunday';

export const KIDS_AGES: KidsAge[] = ['0-6', '7-12', '13-17'];
export const KIDS_RANGES: Record<KidsAge, [number, number]> = { '0-6': [0, 6], '7-12': [7, 12], '13-17': [13, 17] };

export interface AskState {
	at: string;
	count: number;
	answered?: boolean;
}

export interface Profile {
	v: 1;
	onboarded: boolean;
	placeId?: string;
	/** Device location rounded to about 100 m, when the user allowed it. */
	geo?: LatLng & { at: string };
	apkaime?: string;
	companions: Companion[];
	kids: KidsAge[];
	cats: CategoryId[];
	tags: string[];
	less: CategoryId[];
	maxTravelMin?: 30 | 60 | 120 | null;
	timePref?: TimePref[];
	priceMax?: 0 | 10 | 30 | null;
	textSize: 'normal' | 'large';
	asked: Record<string, AskState>;
	sessions: number;
	lastSessionAt?: string;
	/** Opened event count per category, drives progressive questions. */
	opens: Partial<Record<CategoryId, number>>;
	elsewhereOpens: number;
	updatedAt: string;
}

export const PROFILE_KEY = 'iziet.profile.v1';

export function defaultProfile(now = new Date()): Profile {
	return {
		v: 1,
		onboarded: false,
		companions: [],
		kids: [],
		cats: [],
		tags: [],
		less: [],
		textSize: 'normal',
		asked: {},
		sessions: 0,
		opens: {},
		elsewhereOpens: 0,
		updatedAt: now.toISOString()
	};
}

/** Accepts unknown stored JSON and returns a valid profile (bad input gives defaults). */
export function parseProfile(raw: unknown): Profile {
	const base = defaultProfile();
	if (!raw || typeof raw !== 'object' || (raw as Profile).v !== 1) return base;
	const input = raw as Record<string, unknown>;
	// Only known fields with valid values are kept; synced or tampered data cannot add keys.
	const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T[] =>
		Array.isArray(value) ? [...new Set(value.filter((v): v is T => allowed.includes(v as T)))] : [];
	const strings = (value: unknown): string[] =>
		Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.length < 40).slice(0, 100) : [];
	const num = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
	const str = (value: unknown): string | undefined => (typeof value === 'string' && value.length < 40 ? value : undefined);
	const geo = input.geo as Record<string, unknown> | undefined;
	const geoLat = num(geo?.lat);
	const geoLng = num(geo?.lng);
	const travel = num(input.maxTravelMin);
	const price = num(input.priceMax);
	return {
		...base,
		onboarded: input.onboarded === true,
		placeId: str(input.placeId),
		geo: geoLat !== undefined && geoLng !== undefined ? { lat: geoLat, lng: geoLng, at: str(geo?.at) ?? base.updatedAt } : undefined,
		apkaime: str(input.apkaime),
		companions: oneOf(input.companions, ['alone', 'friends', 'family'] as const),
		kids: oneOf(input.kids, KIDS_AGES),
		cats: oneOf(input.cats, CATEGORY_IDS),
		tags: strings(input.tags),
		less: oneOf(input.less, CATEGORY_IDS),
		maxTravelMin: travel === 30 || travel === 60 || travel === 120 ? travel : input.maxTravelMin === null ? null : undefined,
		timePref: Array.isArray(input.timePref) ? oneOf(input.timePref, ['weekday', 'saturday', 'sunday'] as const) : undefined,
		priceMax: price === 0 || price === 10 || price === 30 ? price : input.priceMax === null ? null : undefined,
		textSize: input.textSize === 'large' ? 'large' : 'normal',
		asked: input.asked && typeof input.asked === 'object' ? (input.asked as Profile['asked']) : {},
		sessions: num(input.sessions) ?? 0,
		lastSessionAt: str(input.lastSessionAt),
		opens: input.opens && typeof input.opens === 'object' ? (input.opens as Profile['opens']) : {},
		elsewhereOpens: num(input.elsewhereOpens) ?? 0,
		updatedAt: str(input.updatedAt) ?? base.updatedAt
	};
}

export const RIGA = PLACES.find((place) => place.kind === 'riga')!;
const placeById = new Map(PLACES.map((place) => [place.id, place]));
const apkaimeById = new Map(APKAIMES.map((apkaime) => [apkaime.id, apkaime]));

export function getPlace(id: string | undefined): Place | undefined {
	return id ? placeById.get(id) : undefined;
}

export function getApkaime(id: string | undefined): Apkaime | undefined {
	return id ? apkaimeById.get(id) : undefined;
}

/** Rīga's 58 apkaimes lie within about 12 km of the city centre. */
const RIGA_RADIUS_KM = 12;

export interface Origin {
	point: LatLng;
	/** Area type, which sets the "Tuvumā" radius and distance decay. */
	kind: PlaceKind;
	/** Town shown in the UI. */
	place: Place;
	apkaime?: Apkaime;
	/** True when nothing was chosen and Rīga is the fallback. */
	isDefault: boolean;
}

/** Where distances are measured from: device location, then apkaime, then chosen town, then Rīga. */
export function resolveOrigin(profile: Profile): Origin {
	if (profile.geo) {
		const town = nearest(profile.geo, PLACES)?.item ?? RIGA;
		const inRiga = haversineKm(profile.geo, RIGA) <= RIGA_RADIUS_KM;
		const apkaime = inRiga ? (getApkaime(profile.apkaime) ?? nearest(profile.geo, APKAIMES)?.item) : undefined;
		return { point: profile.geo, kind: inRiga ? 'riga' : town.kind, place: inRiga ? RIGA : town, apkaime, isDefault: false };
	}
	const place = getPlace(profile.placeId);
	if (place?.kind === 'riga' || (!place && profile.apkaime)) {
		const apkaime = getApkaime(profile.apkaime);
		return { point: apkaime ?? RIGA, kind: 'riga', place: RIGA, apkaime, isDefault: false };
	}
	if (place) return { point: place, kind: place.kind, place, isDefault: false };
	return { point: RIGA, kind: 'riga', place: RIGA, isDefault: true };
}

/** Largest places first, for the onboarding city chips. */
export const CITY_CHIPS: Place[] = PLACES.filter((p) => p.kind === 'riga' || p.kind === 'state')
	.sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))
	.slice(0, 8);
