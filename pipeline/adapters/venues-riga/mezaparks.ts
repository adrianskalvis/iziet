import type { RawEvent } from '../../../src/lib/shared/types';
import { absoluteUrl, cheerio, cleanText } from '../../lib/html';
import { fixShoutingTitle, isoFrom, notEnded, plainText, readTime, sellerName, withinHorizon } from './common';

export const MEZAPARKS_ID = 'mezaparks';
export const MEZAPARKS_BASE = 'https://estrade.riga.lv';
export const MEZAPARKS_HOME = `${MEZAPARKS_BASE}/`;

/**
 * Links to /pasakumi/<slug>/ on the home page. Its month slider lists the
 * current and next months only. The full calendar loads through a POST to
 * admin-ajax.php, which this adapter does not call.
 */
export function parseMezaparksHome(html: string): string[] {
	const $ = cheerio.load(html);
	const urls = new Set<string>();
	$('a[href*="/pasakumi/"]').each((_, element) => {
		const url = absoluteUrl($(element).attr('href'), MEZAPARKS_HOME);
		if (url && /\/pasakumi\/[^/?#]+\/?$/.test(url)) urls.add(url);
	});
	return [...urls];
}

interface HeroDates {
	start: string;
	end?: string;
	allDay: boolean;
}

/** "S. 07.11.2026. 19:00" or "T. 26.08.2026. 8:00 - Sv. 18.10.2026. 20:00". */
export function parseHeroDates(text: string): HeroDates | undefined {
	const matches = [...text.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})\.?\s*(\d{1,2}[.:]\d{2})?/g)];
	if (matches.length === 0) return undefined;
	const at = (match: RegExpMatchArray) => isoFrom(+match[3], +match[2], +match[1], readTime(match[4]));
	const first = matches[0];
	const last = matches[matches.length - 1];
	return {
		start: at(first),
		end: matches.length > 1 ? at(last) : undefined,
		allDay: !first[4]
	};
}

export function parseMezaparksDetail(html: string, url: string, now: Date, horizonDays: number): RawEvent | undefined {
	const $ = cheerio.load(html);
	const title = cleanText($('.hero-title h1').first().text());
	const dates = parseHeroDates(cleanText($('.hero-date').first().text()));
	if (!title || !dates) return undefined;
	if (!notEnded(dates.start, dates.end, now) || !withinHorizon(dates.start, now, horizonDays)) return undefined;

	const hall = cleanText($('.hero-description').first().text());
	const ticketUrl = absoluteUrl($('.hero-links a.btn-primary').first().attr('href'), url);
	const paragraphs = $('.article-content p.wp-block-paragraph')
		.map((_, p) => cleanText($(p).text()))
		.get()
		.filter(Boolean);
	const image = absoluteUrl($('.image-mask img.image-img').first().attr('src'), url);
	return {
		source: MEZAPARKS_ID,
		sourceId: new URL(url).pathname.split('/').filter(Boolean).pop() ?? url,
		url,
		title: fixShoutingTitle(title),
		description: plainText(paragraphs.join(' ')),
		start: dates.start,
		end: dates.end,
		allDay: dates.allDay || undefined,
		venueName: hall ? `Mežaparka Lielā estrāde, ${hall}` : 'Mežaparka Lielā estrāde',
		town: 'Rīga',
		tickets: ticketUrl ? [{ seller: sellerName(ticketUrl), url: ticketUrl }] : undefined,
		image,
		categoryHint: hall ? [hall] : undefined,
		status: /\batcelt[sa]?\b/i.test(title) ? 'cancelled' : undefined
	};
}
