import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import type { EventCore, EventDetail } from '$shared/types';
import { shardOf } from '$shared/types';
import { directionsUrl } from './directions';

describe('directionsUrl', () => {
	test('uses exact coordinates as a point', () => {
		expect(directionsUrl({ lat: 56.9497, lng: 24.1153, venue: 'LNOB', town: 'Rīga' })).toBe(
			'https://www.google.com/maps/dir/?api=1&destination=56.9497%2C24.1153'
		);
	});

	test('uses venue and address text when only the town centre is known', () => {
		const url = directionsUrl({
			lat: 57.31306,
			lng: 25.27472,
			approx: true,
			venue: 'Neonija',
			address: '"Vējarozes", Dzērbene, LV-4118 Cēsu novads',
			town: 'Dzērbene'
		});
		expect(decodeURIComponent(url.split('destination=')[1])).toBe('Neonija, "Vējarozes", Dzērbene, LV-4118 Cēsu novads');
	});

	test('every event in the data gives a usable destination', () => {
		const events = JSON.parse(readFileSync('static/data/events.json', 'utf8')) as EventCore[];
		const shards = new Map<number, Record<string, EventDetail>>();
		for (const event of events) {
			const shard = shardOf(event.id);
			if (!shards.has(shard)) shards.set(shard, JSON.parse(readFileSync(`static/data/details/${shard}.json`, 'utf8')));
			const detail = shards.get(shard)![event.id];
			expect(detail, event.id).toBeDefined();
			const destination = decodeURIComponent(directionsUrl({ ...event, address: detail.address }).split('destination=')[1]);
			expect(destination, event.title).not.toMatch(/undefined|^,|^$/);
			if (event.approx) expect(destination, event.title).not.toMatch(/^\d+\.\d+,\d+\.\d+$/);
		}
	});
});
