import { describe, expect, test } from 'vitest';
import { fold } from '../../src/lib/shared/fold';
import { rigaDayDiff, rigaIso, rigaParts, toRigaIso } from '../../src/lib/shared/time';
import { parseIsoLoose, parseLvDateTime } from './dates';
import { parseIcs } from './ics';
import { findEvents, jsonLdEventToRaw } from './jsonld';
import { mergePrices, parsePrice } from './price';

describe('time', () => {
	test('uses +02:00 in winter and +03:00 in summer', () => {
		expect(rigaIso(2026, 12, 14, 19, 0)).toBe('2026-12-14T19:00:00+02:00');
		expect(rigaIso(2026, 7, 1, 19, 0)).toBe('2026-07-01T19:00:00+03:00');
	});

	test('converts UTC instants to Riga wall clock', () => {
		expect(toRigaIso('2026-12-14T17:00:00Z')).toBe('2026-12-14T19:00:00+02:00');
		expect(rigaParts('2026-11-20T22:30:00Z')).toMatchObject({ day: 21, hour: 0, minute: 30, weekday: 6 });
	});

	test('counts calendar days in Riga', () => {
		expect(rigaDayDiff('2026-11-20T22:30:00Z', '2026-11-21T10:00:00Z')).toBe(0);
		expect(rigaDayDiff('2026-11-20T21:00:00Z', '2026-11-21T10:00:00Z')).toBe(1);
		expect(rigaDayDiff('2026-11-20T10:00:00+02:00', '2026-11-22T10:00:00+02:00')).toBe(2);
	});
});

describe('fold', () => {
	test('folds every Latvian diacritic', () => {
		expect(fold('ĀČĒĢĪĶĻŅŠŪŽ āčēģīķļņšūž')).toBe('acegiklnsuz acegiklnsuz');
		expect(fold('Rīga')).toBe('riga');
	});
});

describe('dates', () => {
	const now = new Date('2026-11-20T10:00:00Z');

	test('reads ISO with and without offset', () => {
		expect(parseIsoLoose('2026-12-14T19:00')).toEqual({ iso: '2026-12-14T19:00:00+02:00', allDay: false });
		expect(parseIsoLoose('2026-12-14')).toEqual({ iso: '2026-12-14T00:00:00+02:00', allDay: true });
		expect(parseIsoLoose('2026-12-14T17:00:00Z')?.iso).toBe('2026-12-14T19:00:00+02:00');
	});

	test('reads Latvian worded and numeric dates', () => {
		expect(parseLvDateTime('14. decembris, 19.00', now)?.iso).toBe('2026-12-14T19:00:00+02:00');
		expect(parseLvDateTime('2027. gada 3. janvārī plkst. 18:30', now)?.iso).toBe('2027-01-03T18:30:00+02:00');
		expect(parseLvDateTime('14.12.2026 20:00', now)?.iso).toBe('2026-12-14T20:00:00+02:00');
		expect(parseLvDateTime('Sestdiena, 5. jūn.', now)).toEqual({ iso: '2027-06-05T00:00:00+03:00', allDay: true });
	});

	test('rolls a past day and month into next year', () => {
		expect(parseLvDateTime('10. marts', now)?.iso.startsWith('2027-03-10')).toBe(true);
	});
});

describe('price', () => {
	test('reads free entry in several phrasings', () => {
		for (const text of ['Bez maksas', 'Ieeja brīva', 'bezmaksas', 'Free entry', '0 €']) {
			expect(parsePrice(text)?.free).toBe(true);
		}
	});

	test('reads ranges and minimums', () => {
		expect(parsePrice('EUR 59.98 - EUR 105.96')).toEqual({ min: 59.98, max: 105.96 });
		expect(parsePrice('no 12,00 EUR')).toEqual({ min: 12 });
		expect(parsePrice('€12')).toEqual({ min: 12 });
		expect(parsePrice('Ieeja par ziedojumiem')).toBeUndefined();
	});

	test('merges prices from several sources', () => {
		expect(mergePrices([{ min: 15 }, { min: 12, max: 30 }])).toEqual({ min: 12, max: 30 });
		expect(mergePrices([{ free: true }, { free: true }])).toEqual({ free: true, min: 0, max: 0 });
	});
});

describe('ics', () => {
	test('reads folded lines, all-day and UTC times', () => {
		const text = [
			'BEGIN:VCALENDAR',
			'BEGIN:VEVENT',
			'UID:abc@example.lv',
			'SUMMARY:Ziemassvētku koncerts\\, Daugavpils',
			'DTSTART;TZID=Europe/Riga:20261214T190000',
			'DTEND:20261214T190000Z',
			'LOCATION:Vienības nams\\, Rīgas iela 22a',
			'DESCRIPTION:Gara apraksta rinda, kas tiek',
			' turpināta nākamajā rindā',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'SUMMARY:Tirgus',
			'DTSTART;VALUE=DATE:20261219',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\r\n');
		const [concert, market] = parseIcs(text);
		expect(concert.summary).toBe('Ziemassvētku koncerts, Daugavpils');
		expect(concert.start).toEqual({ iso: '2026-12-14T19:00:00+02:00', allDay: false });
		expect(concert.end?.iso).toBe('2026-12-14T21:00:00+02:00');
		expect(concert.description).toBe('Gara apraksta rinda, kas tiekturpināta nākamajā rindā');
		expect(market.start).toEqual({ iso: '2026-12-19T00:00:00+02:00', allDay: true });
	});
});

describe('jsonld', () => {
	test('maps a schema.org MusicEvent with offers and geo', () => {
		const html = `<html><head><script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@graph': [
				{ '@type': 'WebPage', name: 'x' },
				{
					'@type': 'MusicEvent',
					name: 'LNSO: Brāmss',
					startDate: '2026-12-14T19:00:00+02:00',
					url: '/event/1',
					location: {
						'@type': 'Place',
						name: 'Lielā ģilde',
						address: { streetAddress: 'Amatu iela 6', addressLocality: 'Rīga' },
						geo: { latitude: '56.9497', longitude: '24.1094' }
					},
					offers: [{ price: '15', url: 'https://www.bilesuparadize.lv/lv/event/1', availability: 'InStock' }, { price: 35 }],
					image: ['https://example.lv/a.jpg']
				}
			]
		})}</script></head></html>`;
		const [node] = findEvents(html);
		const raw = jsonLdEventToRaw(node, { source: 'lnso', pageUrl: 'https://www.lnso.lv/event-list/' });
		expect(raw).toMatchObject({
			title: 'LNSO: Brāmss',
			url: 'https://www.lnso.lv/event/1',
			venueName: 'Lielā ģilde',
			address: 'Amatu iela 6, Rīga',
			town: 'Rīga',
			lat: 56.9497,
			priceMin: 15,
			priceMax: 35,
			image: 'https://example.lv/a.jpg'
		});
		expect(raw?.tickets?.[0]).toEqual({ seller: 'bilesuparadize.lv', url: 'https://www.bilesuparadize.lv/lv/event/1' });
	});
});
