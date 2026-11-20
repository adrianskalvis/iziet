import { describe, expect, test } from 'vitest';
import type { EventItem } from '$shared/types';
import { defaultProfile, type Profile } from './profile';
import { listEvents, pickElsewhere, pickLatvia, pickNearby, reasonLabels, scoreEvent } from './rank';
import { resolveOrigin } from './profile';

// Friday 20 November 2026, 12.00 in Riga.
const now = new Date('2026-11-20T10:00:00Z');

let seq = 0;
function event(partial: Partial<EventItem>): EventItem {
	seq += 1;
	return {
		id: `e${seq}`,
		title: `Pasākums ${seq}`,
		cat: 'koncerti',
		tags: [],
		start: '2026-11-22T16:00:00+02:00',
		town: 'Rīga',
		tickets: [],
		url: 'https://example.lv',
		sources: [{ id: 'test', name: 'Test', url: 'https://example.lv' }],
		...partial
	};
}

function profile(partial: Partial<Profile>): Profile {
	return { ...defaultProfile(now), onboarded: true, ...partial };
}

// Āgenskalns centroid and nearby points.
const AGENSKALNS = { lat: 56.93983, lng: 24.07439, apkaime: 'agenskalns' };
const IMANTA = { lat: 56.9535, lng: 23.9708, apkaime: 'imanta' };
const CENTRS = { lat: 56.9496, lng: 24.1052, apkaime: 'centrs' };

const familyProfile = profile({
	placeId: 'Q1773',
	apkaime: 'agenskalns',
	companions: ['family'],
	kids: ['0-6', '7-12'],
	cats: ['koncerti', 'teatris']
});

describe('scoreEvent', () => {
	test('gives D = 1 inside the own apkaime and labels it "Tuvu tev"', () => {
		const choir = event({ ...AGENSKALNS, price: { free: true }, family: true });
		const scored = scoreEvent(choir, familyProfile, resolveOrigin(familyProfile), now);
		expect(scored.parts.D).toBe(1);
		expect(scored.parts.I).toBe(1);
		expect(scored.score).toBeGreaterThan(0.85);
		expect(reasonLabels(scored, familyProfile, now).map((l) => l.key)).toEqual(['reason.nearYou', 'reason.free']);
	});

	test('neutral interest is 0.5 when the user picked nothing', () => {
		const skipped = profile({});
		const scored = scoreEvent(event({ ...CENTRS }), skipped, resolveOrigin(skipped), now);
		expect(scored.parts.I).toBe(0.5);
	});
});

describe('pickNearby', () => {
	test('fills the own apkaime first and drops events under 0.5', () => {
		const own = event({ ...AGENSKALNS, title: 'Kora koncerts', price: { free: true } });
		const centre = event({ ...CENTRS, cat: 'teatris', title: 'Leļļu izrāde', price: { min: 12 } });
		const lecture = event({ ...IMANTA, cat: 'izstades', start: '2026-12-10T18:00:00+02:00', price: { min: 40 } });
		const result = pickNearby([lecture, centre, own], familyProfile, now);
		expect(result.picks.map((p) => p.event.title)).toEqual(['Kora koncerts', 'Leļļu izrāde']);
	});

	test('hides 18+ events from families and past events from everyone', () => {
		const adult = event({ ...AGENSKALNS, adult: true });
		const past = event({ ...AGENSKALNS, start: '2026-11-19T19:00:00+02:00' });
		expect(pickNearby([adult, past], familyProfile, now).picks).toHaveLength(0);
	});

	test('shows one event per category unless the user picked that category', () => {
		const titles = (p: Profile) => pickNearby([concertA, concertB, concertC, show], p, now).picks.map((x) => x.event.title);
		const concertA = event({ ...CENTRS, title: 'Džeza vakars', start: '2026-11-20T19:00:00+02:00' });
		const concertB = event({ ...CENTRS, title: 'Balāde', start: '2026-11-21T17:00:00+02:00' });
		const concertC = event({ ...CENTRS, title: 'Jubilate', start: '2026-11-22T18:00:00+02:00' });
		const show = event({ ...CENTRS, cat: 'teatris', title: 'Izrāde', start: '2026-11-22T19:00:00+02:00' });
		expect(titles(profile({ ...CENTRS }))).toEqual(['Džeza vakars', 'Izrāde']);
		expect(titles(profile({ ...CENTRS, cats: ['koncerti'] }))).toHaveLength(3);
	});

	test('suggests the nearest town when nothing fits nearby', () => {
		const sigulda = event({ lat: 57.1539, lng: 24.8544, town: 'Sigulda', placeId: 'Q465698' });
		const result = pickNearby([sigulda], profile({ placeId: 'Q1773', cats: ['koncerti'] }), now);
		expect(result.picks).toHaveLength(0);
		expect(result.nearestTown?.name).toBe('Sigulda');
		expect(Math.round(result.nearestTown!.km)).toBe(51);
	});
});

describe('pickElsewhere', () => {
	test('picks matching events from different towns outside the nearby radius', () => {
		const liepaja1 = event({ lat: 56.5083, lng: 21.0111, town: 'Liepāja' });
		const liepaja2 = event({ lat: 56.51, lng: 21.01, town: 'Liepāja' });
		const cesis = event({ lat: 57.313, lng: 25.2747, town: 'Cēsis' });
		const sports = event({ lat: 55.8714, lng: 26.5161, town: 'Daugavpils', cat: 'sports' });
		const picks = pickElsewhere([liepaja1, liepaja2, cesis, sports], profile({ placeId: 'Q1773', cats: ['koncerti'] }), now, 10);
		expect(picks.map((p) => p.event.town).sort()).toEqual(['Cēsis', 'Liepāja']);
	});
});

describe('listEvents', () => {
	test('filters by weekend and free entry', () => {
		const saturday = event({ ...CENTRS, start: '2026-11-21T12:00:00+02:00', price: { free: true } });
		const monday = event({ ...CENTRS, start: '2026-11-23T12:00:00+02:00', price: { free: true } });
		const paid = event({ ...CENTRS, start: '2026-11-22T12:00:00+02:00', price: { min: 5 } });
		const items = listEvents([saturday, monday, paid], profile({}), now, { scope: 'all', whens: ['weekend'], free: true });
		expect(items.map((i) => i.event.id)).toEqual([saturday.id]);
	});
});

describe('listEvents with several choices', () => {
	const today = event({ ...CENTRS, title: 'Šodien', start: '2026-11-20T19:00:00+02:00' });
	const tomorrow = event({ ...CENTRS, cat: 'teatris', title: 'Rīt', start: '2026-11-21T19:00:00+02:00' });
	const later = event({ ...CENTRS, cat: 'sports', title: 'Vēlāk', start: '2026-11-27T19:00:00+02:00' });
	const titles = (options: Parameters<typeof listEvents>[3]) =>
		listEvents([later, tomorrow, today], profile({ ...CENTRS }), now, options).map((x) => x.event.title);

	test('two days chosen show events of either day', () => {
		expect(titles({ scope: 'all', whens: ['today', 'tomorrow'], sort: 'soon' })).toEqual(['Šodien', 'Rīt']);
	});

	test('two categories chosen show events of either category', () => {
		expect(titles({ scope: 'all', cats: ['teatris', 'sports'], sort: 'soon' })).toEqual(['Rīt', 'Vēlāk']);
	});

	test('soonest and nearest together sort by day, then by distance', () => {
		const farToday = event({ lat: 57.3119, lng: 25.2746, town: 'Cēsis', title: 'Tālu šodien', start: '2026-11-20T12:00:00+02:00' });
		expect(titles({ scope: 'all', sort: 'soon-near' }).slice(0, 2)).toEqual(['Šodien', 'Rīt']);
		expect(
			listEvents([farToday, today, tomorrow], profile({ ...CENTRS }), now, { scope: 'all', sort: 'soon-near' }).map((x) => x.event.title)
		).toEqual(['Šodien', 'Tālu šodien', 'Rīt']);
	});
});

describe('listEvents order', () => {
	test('with a period chosen, events that start in it come before long-running ones', () => {
		const course = event({ ...CENTRS, title: 'Kursi', start: '2026-11-10T10:00:00+02:00', end: '2026-12-17T12:00:00+02:00', price: { free: true } });
		const saturday = event({ ...CENTRS, title: 'Sestdienas tirgus', cat: 'tirdzini', start: '2026-11-21T10:00:00+02:00' });
		const titles = listEvents([course, saturday], profile({ ...CENTRS }), now, { scope: 'all', whens: ['weekend'] }).map((x) => x.event.title);
		expect(titles).toEqual(['Sestdienas tirgus', 'Kursi']);
	});

	test('tonight keeps events that start today from 17.00', () => {
		const morning = event({ ...CENTRS, title: 'Rīta seanss', start: '2026-11-20T10:00:00+02:00' });
		const evening = event({ ...CENTRS, title: 'Vakara koncerts', start: '2026-11-20T19:00:00+02:00' });
		const tomorrow = event({ ...CENTRS, title: 'Rīt', start: '2026-11-21T19:00:00+02:00' });
		const titles = listEvents([morning, evening, tomorrow], profile({ ...CENTRS }), now, { scope: 'all', whens: ['tonight'] }).map((x) => x.event.title);
		expect(titles).toEqual(['Vakara koncerts']);
	});

	test('the whole-country list puts an event 80 km away before one 300 km away', () => {
		const near = event({ lat: 57.3119, lng: 25.2746, town: 'Cēsis', title: 'Cēsīs' });
		const far = event({ lat: 56.5047, lng: 21.0108, town: 'Liepāja', title: 'Liepājā', start: '2026-11-22T12:00:00+02:00' });
		const titles = listEvents([far, near], profile({ ...CENTRS }), now, { scope: 'all' }).map((x) => x.event.title);
		expect(titles).toEqual(['Cēsīs', 'Liepājā']);
	});
});

describe('pickLatvia', () => {
	test('shows the whole country with one event per town and per category', () => {
		const riga = event({ ...CENTRS, title: 'Rīgas koncerts' });
		const rigaShow = event({ ...CENTRS, cat: 'teatris', title: 'Rīgas izrāde' });
		const cesis = event({ lat: 57.3119, lng: 25.2746, town: 'Cēsis', cat: 'teatris', title: 'Cēsu izrāde' });
		const liepaja = event({ lat: 56.5047, lng: 21.0108, town: 'Liepāja', cat: 'izstades', title: 'Liepājas izstāde' });
		const titles = pickLatvia([riga, rigaShow, cesis, liepaja], profile({ ...CENTRS }), now).map((x) => x.event.title);
		expect(titles).toHaveLength(3);
		expect(titles).toEqual(expect.arrayContaining(['Rīgas koncerts', 'Cēsu izrāde', 'Liepājas izstāde']));
	});
});
