/**
 * Price parsing for Latvian and English source text.
 * Returns euro amounts; free entry sets `free: true`.
 */

export interface ParsedPrice {
	min?: number;
	max?: number;
	free?: boolean;
}

const FREE_PATTERNS = [
	/bez\s*maksas/i,
	/bezmaksas/i,
	/ieeja\s+br[iī]va/i,
	/br[iī]va\s+ieeja/i,
	/\bfree\b/i,
	/\bбесплатн/i,
	/^0([.,]00)?\s*(€|eur)?$/i
];

/** Reads "Bez maksas", "EUR 59.98 - EUR 105.96", "no 12,00 EUR", "12 €", "€12", "5–10 eur". */
export function parsePrice(text: string | undefined | null): ParsedPrice | undefined {
	if (!text) return undefined;
	const clean = text.replace(/\s+/g, ' ').trim();
	if (!clean) return undefined;
	if (FREE_PATTERNS.some((pattern) => pattern.test(clean))) return { free: true, min: 0, max: 0 };
	if (/ziedojum|donation/i.test(clean)) return undefined;

	const amounts = [...clean.matchAll(/(\d{1,5}(?:[.,]\d{1,2})?)/g)]
		.map((match) => Number(match[1].replace(',', '.')))
		.filter((value) => Number.isFinite(value) && value >= 0 && value < 10_000);
	if (amounts.length === 0) return undefined;
	const hasCurrency = /€|eur|eiro|euro/i.test(clean);
	if (!hasCurrency && amounts.length > 2) return undefined;
	const min = Math.min(...amounts);
	const max = Math.max(...amounts);
	if (max === 0) return { free: true, min: 0, max: 0 };
	return min === max ? { min } : { min, max };
}

/** Merges price facts from several sources: lowest min, highest max, free only if all agree. */
export function mergePrices(prices: Array<ParsedPrice | undefined>): ParsedPrice | undefined {
	const known = prices.filter((p): p is ParsedPrice => !!p && (p.free || p.min !== undefined));
	if (known.length === 0) return undefined;
	if (known.every((p) => p.free)) return { free: true, min: 0, max: 0 };
	const paid = known.filter((p) => !p.free);
	const mins = paid.map((p) => p.min).filter((v): v is number => v !== undefined);
	const maxs = paid.map((p) => p.max ?? p.min).filter((v): v is number => v !== undefined);
	const min = mins.length ? Math.min(...mins) : undefined;
	const max = maxs.length ? Math.max(...maxs) : undefined;
	return max !== undefined && min !== undefined && max > min ? { min, max } : { min };
}
