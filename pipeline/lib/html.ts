import * as cheerio from 'cheerio';
import { safeHttpUrl } from '../../src/lib/shared/url';

export { cheerio };

/** Collapses whitespace and trims. */
export function cleanText(value: string | undefined | null): string {
	return (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/**
 * Latvian numbers: 8 digits starting with 2 (mobile), 6 (landline) or 8 (toll-free),
 * optional +371, written 29123456, 29 123 456, 29-123-456, 2912 3456, 29 12 34 56 or
 * 29 123456. A dash never joins two groups of four and a digit or dash never sits
 * right before or after, so "2026-2027" and "2026-11-21" stay. An amount of money stays too.
 */
const PHONE =
	/(?:\+371[\s-]?)?(?<![\d-])(?:[268]\d{7}|[268]\d[\s-]\d{3}[\s-]\d{3}|[268]\d{3}\s\d{4}|[268]\d\s\d{2}\s\d{2}\s\d{2}|[268]\d\s\d{6})(?![\d-]|\s?(?:€|eur))/gi;

/** Removes email addresses and phone numbers, then tidies the spaces and punctuation left behind. */
export function scrubText(text: string): string {
	return text
		.replace(EMAIL, '')
		.replace(PHONE, '')
		.replace(/[ \t]{2,}/g, ' ')
		.replace(/[ \t]+([,.;:!?])/g, '$1')
		.replace(/([,.;:])[,.;:]+/g, '$1')
		.trim();
}

/** Closing tags of block elements; each becomes a line break so neighbouring words stay apart. */
const BLOCK_END = /<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi;

/** Converts an HTML fragment to plain text. */
export function htmlToText(html: string | undefined | null): string {
	if (!html) return '';
	const $ = cheerio.load(`<div id="root">${html.replace(/<br\s*\/?>/gi, '\n').replace(BLOCK_END, '\n')}</div>`);
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
