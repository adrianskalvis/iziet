import lv from '$locales/lv.json';

/**
 * Tiny translation helper. All user-facing text lives in locales/lv.json.
 * t('home.nearby') → "Tuvumā"; t('home.place', { place: 'Rīga' }) → "Vieta: Rīga".
 */

type Tree = { [key: string]: string | string[] | Tree };

const dictionary = lv as unknown as Tree;
const pluralRules = new Intl.PluralRules('lv');

function lookup(key: string): unknown {
	let node: unknown = dictionary;
	for (const part of key.split('.')) {
		if (node && typeof node === 'object' && part in (node as Tree)) node = (node as Tree)[part];
		else return undefined;
	}
	return node;
}

function interpolate(text: string, params?: Record<string, string | number>): string {
	if (!params) return text;
	return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function t(key: string, params?: Record<string, string | number>): string {
	const value = lookup(key);
	if (typeof value !== 'string') {
		if (import.meta.env.DEV) console.warn(`Missing translation: ${key}`);
		return key;
	}
	return interpolate(value, params);
}

/** String array from the dictionary, for example month names. */
export function list(key: string): string[] {
	const value = lookup(key);
	return Array.isArray(value) ? value : [];
}

/** True when the key exists, so optional labels can fall back. */
export function has(key: string): boolean {
	return typeof lookup(key) === 'string';
}

/**
 * Latvian plural with three forms: zero (0, 10 to 20, 30...), one (1, 21, 101...), other.
 * plural('events', 21) → "21 pasākums". Zero items use "plural.none" when asked.
 */
export function plural(key: string, n: number, options: { noneKey?: string } = {}): string {
	if (n === 0 && options.noneKey) return t(options.noneKey);
	const forms = lookup(`plural.${key}`) as Record<string, string> | undefined;
	if (!forms) return String(n);
	const form = forms[pluralRules.select(n)] ?? forms.other;
	return interpolate(form, { n: n.toLocaleString('lv-LV') });
}

/** Capitalises the first letter (Latvian labels start with a capital). */
export function capitalize(text: string): string {
	return text ? text.charAt(0).toLocaleUpperCase('lv-LV') + text.slice(1) : text;
}
