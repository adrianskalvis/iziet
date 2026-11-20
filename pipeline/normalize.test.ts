import { describe, expect, test } from 'vitest';
import type { RawEvent } from '../src/lib/shared/types';
import { normalize, tidyTitle } from './normalize';

const ctx = { sourceName: 'Test', now: new Date('2026-11-21T10:00:00Z') };

function raw(patch: Partial<RawEvent> = {}): RawEvent {
	return { source: 'test', sourceId: '1', url: 'https://example.lv/e/1', title: 'Koncerts', start: '2026-12-01T19:00:00+02:00', town: 'Rīga', ...patch };
}

describe('tidyTitle', () => {
	test('keeps a quote that closes a name inside the title', () => {
		expect(tidyTitle('Izstāde “Bilderingshof–Bilderliņi–Bulduri”')).toBe('Izstāde “Bilderingshof–Bilderliņi–Bulduri”');
		expect(tidyTitle('Grupas "Raxtu Raxti" koncerts "Ziema"')).toBe('Grupas "Raxtu Raxti" koncerts "Ziema"');
	});

	test('removes quotes that wrap the whole title', () => {
		expect(tidyTitle('"Ziemas koncerts"')).toBe('Ziemas koncerts');
		expect(tidyTitle('„Ziemas koncerts”')).toBe('Ziemas koncerts');
	});

	test('turns an all-capitals title into capitalised words and keeps names readable', () => {
		expect(tidyTitle('EGILS SILIŅŠ, GEORGIJS OSOKINS UN LNSO')).toBe('Egils Siliņš, Georgijs Osokins un LNSO');
		expect(tidyTitle('LNSO GADUMIJAS KONCERTS')).toBe('LNSO Gadumijas Koncerts');
		expect(tidyTitle('ZIEMASSVĒTKI AR DJ ROGU II')).toBe('Ziemassvētki ar DJ Rogu II');
		expect(tidyTitle('ES UN TU: DZEJAS VAKARS')).toBe('Es un Tu: Dzejas Vakars');
	});
});

describe('normalize', () => {
	test('decodes HTML entities in venue and address', () => {
		const item = normalize(raw({ venueName: 'Koncertzāle &quot;Lielais dzintars&quot;', address: 'Radio iela 8 &amp; 10' }), ctx);
		expect(item?.venue).toBe('Koncertzāle "Lielais dzintars"');
		expect(item?.address).toBe('Radio iela 8 & 10');
	});

	test('removes phone numbers and emails from the description and keeps words apart', () => {
		const item = normalize(raw({ description: '<div>Gaidām dalībniekus!</div><div>Pieteikšanās: 26 123 456, info@example.lv</div>' }), ctx);
		expect(item?.desc).toBe('Gaidām dalībniekus! Pieteikšanās:');
	});

	test('reads free entry from the description when the source gives no price', () => {
		expect(normalize(raw({ description: 'Ieeja bez maksas.' }), ctx)?.price).toEqual({ free: true });
		expect(normalize(raw({ description: 'Ieeja bez maksas.', priceMin: 5 }), ctx)?.price).toEqual({ min: 5 });
		expect(normalize(raw({ description: 'Bērniem bez maksas, pieaugušajiem 5 €.' }), ctx)?.price).toBeUndefined();
		expect(normalize(raw({ description: 'Ieeja bērniem bez maksas, pieaugušajiem 10 eiro.' }), ctx)?.price).toBeUndefined();
		expect(normalize(raw({ description: 'Ieeja bez maksas. Zupa EUR 3.' }), ctx)?.price).toBeUndefined();
		expect(normalize(raw({ description: 'Ieeja pensionāriem bez maksas.' }), ctx)?.price).toBeUndefined();
	});

	test('drops council meetings and staff training, which are not leisure events', () => {
		expect(normalize(raw({ title: 'Ogres novada pašvaldības domes sēde' }), ctx)).toBeUndefined();
		expect(normalize(raw({ title: 'Attīstības komitejas sēde' }), ctx)).toBeUndefined();
		expect(normalize(raw({ title: 'Iedzīvotāju sapulce Piltenē' }), ctx)).toBeUndefined();
		expect(normalize(raw({ title: 'Engures pagasta iedzīvotāju konsultatīvās padomes sēde' }), ctx)).toBeUndefined();
		expect(normalize(raw({ title: 'Attālināti kursi pedagogiem “MS Excel izglītībā”' }), ctx)).toBeUndefined();
		expect(normalize(raw({ title: 'Seminārs “Mikrozaļumu audzēšana mājas apstākļos”' }), ctx)).toBeDefined();
	});

	test('files a football game under sports', () => {
		expect(normalize(raw({ title: 'Virslīgas labdarības spēle: FK Kurši - Lekrings' }), ctx)?.cat).toBe('sports');
	});
});
