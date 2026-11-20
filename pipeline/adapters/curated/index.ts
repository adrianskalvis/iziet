import type { Adapter } from '../types';
import { CURATED_RECORDS } from './data';
import { recordToRaw } from './parse';

const adapter: Adapter = {
	id: 'curated',
	name: 'Kurētie pasākumi',
	homepage: 'https://iziet.lv/par',
	kind: 'curated',
	async fetch(ctx) {
		const events = CURATED_RECORDS.map((record) => recordToRaw(record, ctx.now, ctx.horizonDays)).filter(
			(event): event is NonNullable<typeof event> => event !== undefined
		);
		ctx.log(`${events.length} of ${CURATED_RECORDS.length} records have occurrences in ${ctx.horizonDays} days`);
		return events;
	}
};

export default adapter;
