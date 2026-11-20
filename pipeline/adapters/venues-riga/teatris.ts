import type { RawEvent } from '../../../src/lib/shared/types';
import { toRigaIso } from '../../../src/lib/shared/time';
import { absoluteUrl, cheerio, cleanText } from '../../lib/html';
import { parseIsoLoose } from '../../lib/dates';
import {
	fixShoutingTitle,
	plainText,
	productionToEvent,
	type ProductionBase,
	type Show
} from './common';

export const TEATRIS_ID = 'nacionalais-teatris';
export const TEATRIS_BASE = 'https://teatris.lv';
export const TEATRIS_REPERTOIRE = `${TEATRIS_BASE}/repertuars/`;
const ADDRESS = 'Kaļķu iela 6, Rīga';
const VENUE = 'Latvijas Nacionālais teātris';

/** Production pages from the repertoire list. The calendar page loads through admin-ajax and is not used. */
export function parseRepertoire(html: string): string[] {
	const $ = cheerio.load(html);
	const urls = new Set<string>();
	$('.performances-list a.thumb-block[href]').each((_, element) => {
		const url = absoluteUrl($(element).attr('href'), TEATRIS_BASE);
		if (url) urls.add(url);
	});
	return [...urls];
}

function readAge(text: string): number | undefined {
	const match = text.match(/vecums:?\s*(\d{1,2})\s*\+/i);
	return match ? Number(match[1]) : undefined;
}

function readDurationHours(text: string): number | undefined {
	const match = text.match(/(\d+(?:[.,]\d+)?)\s*h\b/i);
	return match ? Number(match[1].replace(',', '.')) : undefined;
}

/** A production page lists its dates with ticket links. One RawEvent with the later dates as occurrences. */
export function parseProduction(html: string, url: string, now: Date, horizonDays: number): RawEvent | undefined {
	const $ = cheerio.load(html);
	const title = cleanText($('h1.event-title').first().text());
	if (!title) return undefined;

	const durationHours = readDurationHours(cleanText($('.event-attribute-name').first().text()));
	const shows: Show[] = $('.ticket-block')
		.map((_, block): Show | undefined => {
			const start = parseIsoLoose($(block).find('time.ticket-date').attr('datetime'))?.iso;
			if (!start) return undefined;
			const link = absoluteUrl($(block).find('a.btn[href]').first().attr('href'), url);
			const label = cleanText($(block).text());
			const end = durationHours ? toRigaIso(Date.parse(start) + durationHours * 3600_000) : undefined;
			return {
				start,
				end,
				ticketUrl: link,
				soldOut: !link && /izpārdots/i.test(label)
			};
		})
		.get()
		.filter((show): show is Show => !!show);

	const bodyText = cleanText($('.text-content').text());
	const paragraphs = $('.text-content p')
		.map((_, p) => cleanText($(p).text()))
		.get()
		.filter((text) => text && !/^Titri\b/i.test(text));
	const kind = cleanText($('.event-type').first().text());
	const hall = cleanText($('.event-attribute-value span').first().text());
	const background = $('.event-large-header-inner').attr('style')?.match(/url\('([^']+)'\)/)?.[1];
	const size = background?.match(/-(\d{3,4})x(\d{3,4})\.\w+$/);

	const base: ProductionBase = {
		source: TEATRIS_ID,
		sourceId: new URL(url).pathname.split('/').filter(Boolean).pop() ?? url,
		url,
		title: fixShoutingTitle(title),
		description: plainText(paragraphs.join(' ')),
		venueName: hall ? `${VENUE}, ${hall}` : VENUE,
		address: ADDRESS,
		town: 'Rīga',
		image: background,
		imageWidth: size ? Number(size[1]) : undefined,
		imageHeight: size ? Number(size[2]) : undefined,
		categoryHint: [kind].filter(Boolean),
		ageMin: readAge(bodyText),
		defaultCategory: 'teatris'
	};
	return productionToEvent(base, shows, now, horizonDays);
}
