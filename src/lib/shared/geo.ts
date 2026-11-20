export interface LatLng {
	lat: number;
	lng: number;
}

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** True when the point lies inside a ring of [lng, lat] pairs (ray casting). */
export function pointInRing(point: LatLng, ring: ReadonlyArray<readonly [number, number]>): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		const crosses = yi > point.lat !== yj > point.lat;
		if (crosses && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

/** Nearest item by straight-line distance, or undefined for an empty list. */
export function nearest<T extends LatLng>(point: LatLng, items: readonly T[]): { item: T; km: number } | undefined {
	let best: { item: T; km: number } | undefined;
	for (const item of items) {
		const km = haversineKm(point, item);
		if (!best || km < best.km) best = { item, km };
	}
	return best;
}
