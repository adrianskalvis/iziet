/**
 * Asks an image CDN for a smaller copy when its URL already has a width
 * parameter (Fienta "width=", WordPress Photon "w="). Other URLs are unchanged:
 * nothing is re-hosted.
 */
export function sizedImage(src: string, width: number): string {
	try {
		const url = new URL(src);
		for (const key of ['width', 'w']) {
			if (!url.searchParams.has(key)) continue;
			const current = Number(url.searchParams.get(key));
			if (!Number.isFinite(current) || current > width) url.searchParams.set(key, String(width));
			return url.toString();
		}
		return src;
	} catch {
		return src;
	}
}
