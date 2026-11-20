import { rigaDayKey } from '../../../src/lib/shared/time';
import type { RawEvent } from '../../../src/lib/shared/types';
import { parseLvDateTime } from '../../lib/dates';
import { absoluteUrl, cheerio, cleanText } from '../../lib/html';
import { parsePrice } from '../../lib/price';
import { defined, sellerFromUrl } from './common';
import type { JsonLdSite, ListingItem, Selection } from './parse';

const LIEPAJA_BASE = 'https://kalendars.liepaja.lv';
const DAILES_CALENDAR = 'https://www.dailesteatris.lv/lv/kalendars';

/** Liepāja calendar listing: one li per event occurrence with date, place, fee and ticket link. */
export function parseLiepajaListing(html: string, pageUrl: string, now: Date): ListingItem[] {
	const $ = cheerio.load(html);
	const items: ListingItem[] = [];
	$('a.title').each((_, anchor) => {
		const item = $(anchor).closest('li');
		const url = absoluteUrl($(anchor).attr('href'), pageUrl);
		const title = cleanText($(anchor).find('h3').text());
		if (!url || !title) return;
		const date = parseLvDateTime(cleanText(item.find('.event-date').first().text()), now);
		const fee = item.find('.event-fee a').first();
		const price = parsePrice(cleanText(fee.text()));
		const feeUrl = absoluteUrl(fee.attr('href'), pageUrl);
		const ticket = feeUrl && !feeUrl.startsWith(LIEPAJA_BASE) ? { seller: sellerFromUrl(feeUrl), url: feeUrl } : undefined;
		const background = item.find('.img').attr('style')?.match(/url\('([^']+)'\)/)?.[1];
		const event: Partial<RawEvent> = defined({
			title,
			start: date?.iso,
			allDay: date?.allDay || undefined,
			venueName: cleanText(item.find('.event-place').first().text()),
			priceMin: price?.min,
			priceMax: price?.max,
			free: price?.free,
			tickets: ticket ? [ticket] : undefined,
			image: background?.replace('/small_', '/large_')
		});
		items.push({ url, event });
	});
	return items;
}

function nextLiepajaPage($: cheerio.CheerioAPI, pageUrl: string): string | undefined {
	return absoluteUrl($('#events-loadmore-btn').attr('data-url'), pageUrl);
}

/** Dailes calendar: JSON-LD has the time and offer, the markup has the show page, hall and price range. */
export function enrichDailes(raw: RawEvent, container: Selection | undefined): RawEvent {
	if (!container) return raw;
	const page = absoluteUrl(container.find('h3.title a').attr('href'), DAILES_CALENDAR);
	const facts = container.find('ul.more li:not(.divider)');
	const hall = cleanText(facts.first().text());
	const priceText = cleanText(facts.last().text());
	const price = /EUR|€/i.test(priceText) ? parsePrice(priceText) : undefined;
	const url = page ?? raw.url;
	return {
		...raw,
		url,
		sourceId: `${url}#${raw.start}`,
		venueName: hall && !/^\d|^citi/i.test(hall) && hall !== raw.venueName ? `${raw.venueName ?? 'Dailes teātris'}, ${hall}` : raw.venueName,
		...defined({ priceMin: price?.min ?? raw.priceMin, priceMax: price?.max ?? raw.priceMax, free: price?.free ?? raw.free })
	};
}

export const JSONLD_SITES: JsonLdSite[] = [
	{
		id: 'daugavpils',
		name: 'Daugavpils pilsētas afiša',
		homepage: 'https://www.daugavpils.lv/afisa/',
		town: 'Daugavpils',
		listingUrls: ['https://www.daugavpils.lv/afisa/'],
		mode: 'detail',
		detailLink: /^https:\/\/www\.daugavpils\.lv\/afisa\/[a-z0-9][a-z0-9.-]*$/i,
		followAnchors: false,
		maxDetailPages: 40,
		skipTitle: /^Pasākumi daugavpil/i,
		describe: ($) =>
			$('.event-content-info')
				.nextAll('p')
				.slice(0, 6)
				.map((_, paragraph) => $(paragraph).text())
				.get()
				.join(' '),
		imageRewrite: (url) => url.replace(/_min(\.\w+)$/, '_med$1')
	},
	{
		id: 'liepaja',
		name: 'Liepājas pasākumu kalendārs',
		homepage: 'https://kalendars.liepaja.lv/lv/',
		town: 'Liepāja',
		lang: ['lv'],
		listingUrls: (now, horizonDays) => [
			`${LIEPAJA_BASE}/lv/page:1,date_from:${rigaDayKey(now)},date_until:${rigaDayKey(new Date(now.getTime() + horizonDays * 86_400_000))},a:f`
		],
		mode: 'detail',
		detailLink: /^https:\/\/kalendars\.liepaja\.lv\/lv\/\d{4}-\d{2}-\d{2}:\d+/,
		maxListingPages: 24,
		maxDetailPages: 100,
		parseListing: parseLiepajaListing,
		nextPage: nextLiepajaPage,
		detailGroup: (url) => url.match(/\/lv\/\d{4}-\d{2}-\d{2}:(\d+)/)?.[1] ?? url
	},
	{
		id: 'lnso',
		name: 'Latvijas Nacionālais simfoniskais orķestris',
		homepage: 'https://www.lnso.lv/event-list/',
		town: 'Rīga',
		townIsFallback: true,
		defaultCategory: 'koncerti',
		lang: ['lv'],
		keepUpper: ['LNSO'],
		// Concert titles are lists of soloists and composers.
		namesInTitles: true,
		listingUrls: ['https://www.lnso.lv/event-list/'],
		mode: 'detail',
		detailLink: /^https:\/\/www\.lnso\.lv\/event-list\/(?!feed|page)[a-z0-9-]+\/$/,
		maxListingPages: 6,
		maxDetailPages: 80,
		nextPage: ($, pageUrl) => absoluteUrl($('a.next.page-numbers').attr('href'), pageUrl)
	},
	{
		id: 'dailes',
		name: 'Dailes teātris',
		homepage: 'https://www.dailesteatris.lv/lv/kalendars',
		town: 'Rīga',
		defaultCategory: 'teatris',
		lang: ['lv'],
		listingUrls: [DAILES_CALENDAR],
		mode: 'listing',
		containerSelector: '.izrade',
		enrich: enrichDailes
	}
];
