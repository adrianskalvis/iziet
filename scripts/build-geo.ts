/**
 * Builds geodata from committed open-data inputs:
 *   data/geo/apkaimes.kml   Rīgas apkaimes, Rīgas dome via data.gov.lv, CC BY 4.0
 *   data/geo/places-lv.json Latvian settlements from Wikidata, CC0
 * Outputs:
 *   src/lib/shared/places.generated.ts  towns (pop ≥ 2000 or town status) and 58 apkaimes with neighbours
 *   static/data/apkaimes.json           simplified polygons for on-device lookup
 *   data/geo/apkaimes.json              full polygons for the pipeline
 * Run: npm run geo
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Apkaime, Place, PlaceKind } from '../src/lib/shared/types';
import { haversineKm } from '../src/lib/shared/geo';

type Ring = Array<[number, number]>;

interface RawPlace {
	q: string;
	name: string;
	lat: number;
	lng: number;
	kind: 'state' | 'town' | 'village';
	pop: number | null;
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NEIGHBOUR_KM = 0.06;
const SIMPLIFY_TOLERANCE_DEG = 0.0003;
const MIN_VILLAGE_POP = 2000;

function slug(url: string, fallback: string): string {
	const match = url.match(/apkaimes\.lv\/([^/]+)\/?/);
	return match ? match[1] : fallback.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function parseKml(kml: string): Array<{ id: string; name: string; rings: Ring[] }> {
	const placemarks = kml.split('<Placemark').slice(1);
	return placemarks.map((block) => {
		const name = block.match(/<SimpleData name="apkaime">([^<]+)<\/SimpleData>/)?.[1]?.trim() ?? 'Nezināma';
		const link = block.match(/<SimpleData name="saite">([^<]+)<\/SimpleData>/)?.[1] ?? '';
		const rings = [...block.matchAll(/<outerBoundaryIs>\s*<LinearRing>\s*<coordinates>([^<]+)<\/coordinates>/g)].map(
			(match) =>
				match[1]
					.trim()
					.split(/\s+/)
					.map((pair) => {
						const [lng, lat] = pair.split(',').map(Number);
						return [lng, lat] as [number, number];
					})
		);
		return { id: slug(link, name), name, rings };
	});
}

/** Area-weighted centroid of the largest ring. */
function centroid(rings: Ring[]): { lat: number; lng: number } {
	const ring = rings.reduce((a, b) => (b.length > a.length ? b : a));
	let area = 0;
	let cx = 0;
	let cy = 0;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [x0, y0] = ring[j];
		const [x1, y1] = ring[i];
		const cross = x0 * y1 - x1 * y0;
		area += cross;
		cx += (x0 + x1) * cross;
		cy += (y0 + y1) * cross;
	}
	area /= 2;
	return { lng: round(cx / (6 * area)), lat: round(cy / (6 * area)) };
}

function round(value: number, digits = 5): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

function perpendicularDistance(point: [number, number], start: [number, number], end: [number, number]): number {
	const [x, y] = point;
	const [x1, y1] = start;
	const [x2, y2] = end;
	const dx = x2 - x1;
	const dy = y2 - y1;
	if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
	return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / Math.hypot(dx, dy);
}

/** Douglas-Peucker simplification. */
function simplify(points: Ring, tolerance: number): Ring {
	if (points.length < 4) return points;
	let maxDistance = 0;
	let index = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
		if (distance > maxDistance) {
			maxDistance = distance;
			index = i;
		}
	}
	if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
	const left = simplify(points.slice(0, index + 1), tolerance);
	const right = simplify(points.slice(index), tolerance);
	return [...left.slice(0, -1), ...right];
}

function bordering(a: Ring[], b: Ring[]): boolean {
	const step = 3;
	for (const ringA of a) {
		for (let i = 0; i < ringA.length; i += step) {
			const [lngA, latA] = ringA[i];
			for (const ringB of b) {
				for (let j = 0; j < ringB.length; j += step) {
					const [lngB, latB] = ringB[j];
					if (Math.abs(latA - latB) > 0.002 || Math.abs(lngA - lngB) > 0.004) continue;
					if (haversineKm({ lat: latA, lng: lngA }, { lat: latB, lng: lngB }) < NEIGHBOUR_KM) return true;
				}
			}
		}
	}
	return false;
}

async function main(): Promise<void> {
	const kml = await readFile(path.join(ROOT, 'data/geo/apkaimes.kml'), 'utf8');
	const polygons = parseKml(kml);
	if (polygons.length !== 58) throw new Error(`Expected 58 apkaimes, got ${polygons.length}`);

	const apkaimes: Apkaime[] = polygons.map((polygon) => ({
		id: polygon.id,
		name: polygon.name,
		...centroid(polygon.rings),
		near: polygons.filter((other) => other.id !== polygon.id && bordering(polygon.rings, other.rings)).map((o) => o.id)
	}));

	const rawPlaces = JSON.parse(await readFile(path.join(ROOT, 'data/geo/places-lv.json'), 'utf8')) as RawPlace[];
	const places: Place[] = rawPlaces
		.filter((p) => p.kind !== 'village' || (p.pop ?? 0) >= MIN_VILLAGE_POP)
		.map((p) => ({
			id: p.q,
			name: p.name,
			lat: p.lat,
			lng: p.lng,
			kind: (p.name === 'Rīga' && p.kind === 'state' ? 'riga' : p.kind) as PlaceKind,
			...(p.pop ? { pop: p.pop } : {})
		}));

	const banner = '// Generated by scripts/build-geo.ts. Do not edit by hand.\n// Sources: Wikidata (CC0); Rīgas apkaimes, Rīgas dome via data.gov.lv (CC BY 4.0).\n';
	const ts = `${banner}import type { Apkaime, Place } from './types';\n\nexport const PLACES: Place[] = ${JSON.stringify(places)};\n\nexport const APKAIMES: Apkaime[] = ${JSON.stringify(apkaimes)};\n`;
	await writeFile(path.join(ROOT, 'src/lib/shared/places.generated.ts'), ts);

	const simplified = polygons.map((p) => ({
		id: p.id,
		rings: p.rings.map((ring) => simplify(ring, SIMPLIFY_TOLERANCE_DEG).map(([lng, lat]) => [round(lng), round(lat)]))
	}));
	await mkdir(path.join(ROOT, 'static/data'), { recursive: true });
	await writeFile(path.join(ROOT, 'static/data/apkaimes.json'), JSON.stringify(simplified));
	await writeFile(path.join(ROOT, 'data/geo/apkaimes.json'), JSON.stringify(polygons.map((p) => ({ id: p.id, name: p.name, rings: p.rings }))));

	const lonely = apkaimes.filter((a) => a.near.length === 0).map((a) => a.name);
	console.log(`places: ${places.length}, apkaimes: ${apkaimes.length}, without neighbours: ${lonely.join(', ') || 'none'}`);
	console.log(`simplified points: ${simplified.reduce((sum, p) => sum + p.rings.reduce((s, r) => s + r.length, 0), 0)}`);
}

await main();
