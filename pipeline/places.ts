import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fold } from '../src/lib/shared/fold';
import { haversineKm, pointInRing, type LatLng } from '../src/lib/shared/geo';

/**
 * Pipeline-side gazetteer: all 5,202 Latvian settlements from Wikidata (CC0)
 * and full-resolution Rīga apkaime polygons (Rīgas dome, CC BY 4.0).
 */

export interface GazetteerPlace {
	q: string;
	name: string;
	lat: number;
	lng: number;
	kind: 'state' | 'town' | 'village';
	pop: number | null;
}

interface ApkaimePolygon {
	id: string;
	name: string;
	rings: Array<Array<[number, number]>>;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const places = JSON.parse(readFileSync(path.join(ROOT, 'data/geo/places-lv.json'), 'utf8')) as GazetteerPlace[];
const apkaimes = JSON.parse(readFileSync(path.join(ROOT, 'data/geo/apkaimes.json'), 'utf8')) as ApkaimePolygon[];

export const RIGA = places.find((p) => p.name === 'Rīga' && p.kind === 'state')!;
const RIGA_RADIUS_KM = 14;

/** Settlements by their folded name stem, larger places first. */
const byStem = new Map<string, GazetteerPlace[]>();
for (const place of [...places].sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))) {
	for (const key of nameKeys(place.name)) {
		const list = byStem.get(key) ?? [];
		list.push(place);
		byStem.set(key, list);
	}
}

/** Folded name plus a stem without the Latvian case ending, so "Rīgā" and "Rīgas" find "Rīga". */
function nameKeys(name: string): string[] {
	const folded = fold(name).trim();
	return [folded, stem(folded)];
}

function stem(word: string): string {
	return word.replace(/(as|ai|am|os|es|is|us|ā|a|e|s|u|i|o)$/u, '');
}

export function apkaimeAt(point: LatLng): string | undefined {
	if (haversineKm(point, RIGA) > RIGA_RADIUS_KM) return undefined;
	return apkaimes.find((a) => a.rings.some((ring) => pointInRing(point, ring)))?.id;
}

/** Town for a coordinate: Rīga when inside an apkaime, else the nearest town, else the nearest village. */
export function placeAt(point: LatLng): GazetteerPlace | undefined {
	if (apkaimeAt(point)) return RIGA;
	let bestTown: { place: GazetteerPlace; km: number } | undefined;
	let bestVillage: { place: GazetteerPlace; km: number } | undefined;
	for (const place of places) {
		const km = haversineKm(point, place);
		if (place.kind === 'village') {
			if (!bestVillage || km < bestVillage.km) bestVillage = { place, km };
		} else if (!bestTown || km < bestTown.km) {
			bestTown = { place, km };
		}
	}
	if (bestTown && bestTown.km <= 6) return bestTown.place;
	if (bestVillage && bestVillage.km <= 3) return bestVillage.place;
	return bestTown && bestTown.km <= 15 ? bestTown.place : bestVillage?.place;
}

/** Words after a place name that make it a municipality ("Cēsu novads"), not where the event is. */
const MUNICIPALITY = /^(novad|pagast)/;
/** Street types: the 1 to 3 words before them are a street name ("Krišjāņa Barona iela"). */
const STREET = /^(iela|iel|aleja|alej|prospekt|bulvar|gatve|gatv|laukum|soseja|sosej|cels|krastmala|dambis|ielas)$/;

function skippable(words: string[], start: number, end: number): boolean {
	if (MUNICIPALITY.test(words[end] ?? '')) return true;
	for (let i = start; i < end; i++) if (STREET.test(words[i])) return true;
	for (let next = end; next < Math.min(words.length, end + 3); next++) if (STREET.test(words[next])) return true;
	return false;
}

/**
 * Finds a settlement named in free text such as "Jelgavā" or "Liepāja, Rožu iela 1".
 * Texts are tried in order (source town, then address, then venue). Municipality
 * names ("Cēsu novads") and street names ("Krišjāņa Barona iela") are skipped, and
 * a town beats a village in the same text, so '"Vējarozes", Dzērbene, LV-4118
 * Cēsu novads' gives Dzērbene and "Rīgas iela 5, Cēsis" gives Cēsis.
 */
export function placeFromText(...texts: Array<string | undefined>): GazetteerPlace | undefined {
	for (const strict of [true, false]) {
		for (const text of texts) {
			if (!text) continue;
			const words = fold(text)
				.split(/[^a-z0-9]+/)
				.filter((word) => word.length >= 3);
			let village: GazetteerPlace | undefined;
			for (let size = 3; size >= 1; size--) {
				for (let i = 0; i + size <= words.length; i++) {
					if (strict && skippable(words, i, i + size)) continue;
					const phrase = words.slice(i, i + size).join(' ');
					const match = byStem.get(phrase) ?? byStem.get(stem(phrase));
					if (!match?.length) continue;
					const town = match.find((p) => p.kind !== 'village');
					if (town) return town;
					village ??= match[0];
				}
			}
			if (village) return village;
		}
	}
	return undefined;
}
