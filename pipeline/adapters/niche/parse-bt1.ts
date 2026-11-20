import type { CategoryId, RawEvent } from '../../../src/lib/shared/types';
import { absoluteUrl, cheerio, cleanText, htmlToText, truncate } from '../../lib/html';
import { clock, inWindow, windowFor } from './util';

export const BT1_SOURCE = 'niche-bt1';
export const BT1_PAGE = 'https://www.bt1.lv/?link=00700000';
const BT1_BASE = 'https://www.bt1.lv/';
const DESCRIPTION_MAX = 600;
const VENUE = {
	name: 'Starptautiskais izstāžu centrs Ķīpsala',
	address: 'Ķīpsalas iela 8',
	town: 'Rīga',
	lat: 56.9555908,
	lng: 24.0792629
};

export interface Bt1Fair {
	name: string;
	/** "YYYY-MM-DD". */
	from: string;
	to: string;
	subtitle: string;
	description: string;
	url: string;
}

/** Fairs for trade visitors only. */
const TRADE_ONLY = /mašīnbūves|metālapstrādes/i;

interface Classification {
	cat: CategoryId;
	tags: string[];
}

const BY_NAME: Array<[RegExp, Classification]> = [
	[/KIDS EXPO/i, { cat: 'gimenem', tags: [] }],
	[/PETEXPO|ZOOEXPO/i, { cat: 'hobiji', tags: ['dzivnieki'] }],
	[/OUTDOOR/i, { cat: 'hobiji', tags: ['daba', 'auto-moto'] }],
	[/^AUTO$/i, { cat: 'hobiji', tags: ['auto-moto'] }],
	[/DĀRZS/i, { cat: 'hobiji', tags: ['darzs'] }],
	[/BEAUTY/i, { cat: 'izstades', tags: ['smarzas'] }]
];

function classify(name: string): Classification {
	return BY_NAME.find(([pattern]) => pattern.test(name))?.[1] ?? { cat: 'izstades', tags: [] };
}

/** "06.11.–08.11.2026." to two ISO dates. A range that wraps the year starts in the year before. */
export function parseFairDates(text: string): { from: string; to: string } | undefined {
	const m = text.match(/(\d{1,2})\.(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
	if (!m) return undefined;
	const [, d1, m1, d2, m2, year] = m;
	const endYear = Number(year);
	const startYear = Number(m1) > Number(m2) ? endYear - 1 : endYear;
	const pad = (n: string) => n.padStart(2, '0');
	return { from: `${startYear}-${pad(m1)}-${pad(d1)}`, to: `${endYear}-${pad(m2)}-${pad(d2)}` };
}

/** One <div class="row"> per fair: logo column, name and dates column, description column. */
export function parseBt1Fairs(html: string): Bt1Fair[] {
	const $ = cheerio.load(html);
	const fairs: Bt1Fair[] = [];
	$('div.row').each((_, row) => {
		const columns = $(row).children('div');
		if (columns.length < 3) return;
		const info = columns.eq(1);
		const anchor = info.find('a').first();
		const name = cleanText(anchor.text());
		const dates = parseFairDates(info.text());
		if (!name || !dates) return;
		const subtitle = cleanText(info.children('b').first().text());
		fairs.push({
			name,
			...dates,
			subtitle,
			description: htmlToText(columns.eq(2).html()),
			url: absoluteUrl(anchor.attr('href'), BT1_BASE) ?? BT1_PAGE
		});
	});
	return fairs;
}

export function bt1FairToRaw(fair: Bt1Fair, now: Date, horizonDays: number): RawEvent | undefined {
	if (TRADE_ONLY.test(fair.subtitle)) return undefined;
	const start = clock(fair.from, '00:00');
	const end = clock(fair.to, '23:59');
	if (!inWindow(windowFor(now, horizonDays), start, end)) return undefined;
	const { cat, tags } = classify(fair.name);
	const title = fair.name
		.toLowerCase()
		.split(' ')
		.map((word) => (word === 'un' ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
		.join(' ');
	return {
		source: BT1_SOURCE,
		sourceId: `${fair.name}-${fair.from}`,
		url: fair.url,
		title: `${title}: ${fair.subtitle}`,
		description: truncate(fair.description, DESCRIPTION_MAX) || undefined,
		start,
		end,
		allDay: true,
		venueName: VENUE.name,
		address: VENUE.address,
		town: VENUE.town,
		lat: VENUE.lat,
		lng: VENUE.lng,
		tags: tags.length ? tags : undefined,
		lang: ['lv'],
		status: 'scheduled',
		defaultCategory: cat
	};
}
