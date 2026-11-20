import type { Adapter, AdapterContext } from '../types';
import {
	type CinemaConfig,
	type CinemaShow,
	parseApolloSchedule,
	parseForumSchedule,
	showsToEvents
} from './parse';

/** The feeds return up to this many days from today in one response. */
const FEED_DAYS = 14;

const APOLLO: CinemaConfig = {
	source: 'apollo-kino',
	sellerName: 'Apollo Kino',
	addresses: {
		'Apollo Kino Akropole Rīga': 'Maskavas iela 257, Rīga',
		'Apollo Kino Rīga Plaza': 'Mūkusalas iela 71, Rīga',
		'Apollo Kino Domina': 'Ieriķu iela 3, Rīga'
	}
};

const FORUM: CinemaConfig = {
	source: 'forum-cinemas',
	sellerName: 'Forum Cinemas',
	addresses: {
		'Forum Cinemas Centrs': 'Elizabetes iela 61, Rīga',
		'Forum Cinemas Alfa': 'Brīvības gatve 372, Rīga'
	}
};

function cinema(
	config: CinemaConfig,
	meta: { name: string; homepage: string; feedUrl: string; parse: (body: string) => CinemaShow[] }
): Adapter {
	return {
		id: config.source,
		name: meta.name,
		homepage: meta.homepage,
		kind: 'feed',
		defaultCategory: 'izstades',
		async fetch(ctx: AdapterContext) {
			const days = Math.min(FEED_DAYS, ctx.horizonDays);
			const body = await ctx.http.text(`${meta.feedUrl}?nrOfDays=${days}`);
			const shows = meta.parse(body);
			const events = showsToEvents(shows, config, ctx.now, ctx.horizonDays);
			ctx.log(`${config.source}: ${shows.length} shows, ${events.length} films per cinema`);
			return events;
		}
	};
}

export const apolloKino = cinema(APOLLO, {
	name: 'Apollo Kino',
	homepage: 'https://www.apollokino.lv',
	feedUrl: 'https://www.apollokino.lv/xml/Schedule',
	parse: parseApolloSchedule
});

export const forumCinemas = cinema(FORUM, {
	name: 'Forum Cinemas',
	homepage: 'https://www.forumcinemas.lv',
	feedUrl: 'https://www.forumcinemas.lv/xml/Schedule/',
	parse: parseForumSchedule
});

export default [apolloKino, forumCinemas] satisfies Adapter[];
