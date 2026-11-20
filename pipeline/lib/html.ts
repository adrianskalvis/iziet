import * as cheerio from 'cheerio';
import { safeHttpUrl } from '../../src/lib/shared/url';

export { cheerio };

/** Collapses whitespace and trims. */
export function cleanText(value: string | undefined | null): string {
	return (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/** Converts an HTML fragment to plain text. */
export function htmlToText(html: string | undefined | null): string {
	if (!html) return '';
	const $ = cheerio.load(`<div id="root">${html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')}</div>`);
	return cleanText($('#root').text());
}

/** Cuts text at a word boundary and adds an ellipsis when it is longer than `max`. */
export function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	const cut = text.slice(0, max - 1);
	const space = cut.lastIndexOf(' ');
	return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,.;:\s]+$/, '')}…`;
}

/** Resolves a possibly relative URL; returns undefined for anything but http(s), including obfuscated javascript:. */
export function absoluteUrl(href: string | undefined | null, base: string): string | undefined {
	return safeHttpUrl(href, base);
}

/** Removes utm_* and fbclid parameters so the same link compares equal. */
export function stripTracking(url: string): string {
	try {
		const parsed = new URL(url);
		for (const key of [...parsed.searchParams.keys()]) {
			if (/^utm_|^fbclid$|^gclid$/i.test(key)) parsed.searchParams.delete(key);
		}
		return parsed.toString();
	} catch {
		return url;
	}
}
