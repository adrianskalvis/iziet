import { describe, expect, test } from 'vitest';
import type { EventCore } from '$shared/types';
import { buildIndex, namesTown, searchIds } from './search';

function event(patch: Partial<EventCore>): EventCore {
	return { id: 'e', title: 'Pasākums', cat: 'koncerti', tags: [], start: '2026-12-01T19:00:00+02:00', town: 'Rīga', ...patch } as EventCore;
}

describe('searchIds', () => {
	const film = event({ id: 'film', title: 'Rallijs', cat: 'izstades', tags: ['kino'], venue: 'Forum Cinemas' });
	const photos = event({ id: 'photos', title: 'Pilsētas gaisma', cat: 'izstades', tags: ['fotografija'] });
	const index = buildIndex([film, photos]);

	test('an exhibition query does not return films of the shared category', () => {
		expect(searchIds(index, 'foto izstade')).toEqual(['photos']);
		expect(searchIds(index, 'izstade')).toEqual(['photos']);
	});

	test('a cinema query returns films', () => {
		expect(searchIds(index, 'kino')).toEqual(['film']);
		expect(searchIds(index, 'filma')).toEqual(['film']);
	});
});

describe('namesTown', () => {
	test('is true when a query word of 4 letters or more starts the town name', () => {
		expect(namesTown('jurmala', 'Jūrmala')).toBe(true);
		expect(namesTown('koncerts Jūrmalā', 'Jūrmala')).toBe(true);
		expect(namesTown('cesis', 'Cēsis')).toBe(true);
	});

	test('is false for short words and for other towns', () => {
		expect(namesTown('jur', 'Jūrmala')).toBe(false);
		expect(namesTown('jurmalas iela', 'Mārupe')).toBe(false);
	});
});
