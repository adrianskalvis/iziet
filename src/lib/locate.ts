import { base } from '$app/paths';
import { pointInRing, type LatLng } from '$shared/geo';

/**
 * Device location, rounded to 3 decimals (about 100 m) before it is stored.
 * It never leaves the device.
 */

const LOCATION_TIMEOUT_MS = 10_000;
const MAX_AGE_MS = 10 * 60_000;

export function canLocate(): boolean {
	return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function requestLocation(): Promise<LatLng> {
	return new Promise((resolve, reject) => {
		if (!canLocate()) {
			reject(new Error('Geolocation unavailable'));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(position) =>
				resolve({
					lat: Math.round(position.coords.latitude * 1000) / 1000,
					lng: Math.round(position.coords.longitude * 1000) / 1000
				}),
			(error) => reject(error),
			{ enableHighAccuracy: false, timeout: LOCATION_TIMEOUT_MS, maximumAge: MAX_AGE_MS }
		);
	});
}

type ApkaimePolygons = Array<{ id: string; rings: Array<Array<[number, number]>> }>;
let polygons: Promise<ApkaimePolygons> | null = null;

/** Rīga apkaime that contains the point, using simplified polygons loaded on demand. */
export async function findApkaime(point: LatLng): Promise<string | undefined> {
	polygons ??= fetch(`${base}/data/apkaimes.json`).then((response) => {
		if (!response.ok) throw new Error(`apkaimes.json HTTP ${response.status}`);
		return response.json() as Promise<ApkaimePolygons>;
	});
	try {
		const list = await polygons;
		return list.find((apkaime) => apkaime.rings.some((ring) => pointInRing(point, ring)))?.id;
	} catch (error) {
		console.warn('Apkaime lookup failed', error);
		polygons = null;
		return undefined;
	}
}
