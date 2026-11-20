import type { EventCore, EventItem } from '$shared/types';

type Locatable = Pick<EventCore, 'lat' | 'lng' | 'approx' | 'venue' | 'town'> & Partial<Pick<EventItem, 'address'>>;

/**
 * Google Maps directions link for an event. Exact coordinates go in as a point.
 * When only the town centre is known, the venue and address go in as text, so
 * Maps finds the real place instead of the middle of town.
 */
export function directionsUrl(event: Locatable): string {
	const exact = !event.approx && event.lat !== undefined && event.lng !== undefined;
	const text = [event.venue, event.address, event.town]
		.filter((part): part is string => !!part && part.trim().length > 0)
		.filter((part, index, parts) => !parts.slice(0, index).some((earlier) => earlier.includes(part)))
		.join(', ');
	const destination = exact ? `${event.lat},${event.lng}` : text || `${event.lat},${event.lng}`;
	return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
