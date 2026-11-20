import type { Adapter } from '../types';
import { type FientaResponse, parseFientaEvents } from './parse';

const API_URL = 'https://fienta.com/api/v1/public/events?country=LV';

const fienta: Adapter = {
	id: 'fienta',
	name: 'Fienta',
	homepage: 'https://fienta.com/lv',
	kind: 'api',
	async fetch(ctx) {
		const response = await ctx.http.json<FientaResponse>(API_URL);
		return parseFientaEvents(response, ctx.now, ctx.horizonDays, ctx.log);
	}
};

export default fienta;
