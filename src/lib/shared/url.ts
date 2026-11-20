/**
 * Accepts only absolute http(s) URLs. new URL() strips tabs and newlines, so
 * "java\tscript:" becomes "javascript:" and fails the protocol check here.
 * Used by the pipeline for every scraped link and by the app before rendering one.
 */
export function safeHttpUrl(value: string | undefined | null, base?: string): string | undefined {
	if (!value) return undefined;
	try {
		const url = base ? new URL(value.trim(), base) : new URL(value.trim());
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

/** Same as safeHttpUrl, and upgrades http to https (used for images). */
export function safeHttpsUrl(value: string | undefined | null): string | undefined {
	const url = safeHttpUrl(value);
	return url?.replace(/^http:/, 'https:');
}
