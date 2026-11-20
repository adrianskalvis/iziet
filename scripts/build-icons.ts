/**
 * Renders the PWA icons from the Cielaviņa artwork and writes the web manifest
 * with names from locales/lv.json. Uses Playwright's Chromium to rasterise SVG.
 * Run: npm run icons
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'static/icons');
const BG = '#ECD8C0';

const BIRD = `
	<defs><clipPath id="mascot-body"><ellipse cx="64" cy="55" rx="27" ry="15.5" transform="rotate(-12 64 55)"/></clipPath></defs>
	<g>
		<g><path d="M43 56 L5 78.5 L6.6 82 L45 62.5 Z" fill="#101824" stroke="#101824" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 80.4 L43 63" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></g>
		<path d="M61 70 L59.5 89 M70 68 L71 89 M59.5 89 H66 M71 89 H77.5" stroke="#101824" stroke-width="2" stroke-linecap="round" fill="none"/>
		<ellipse cx="64" cy="55" rx="27" ry="15.5" transform="rotate(-12 64 55)" fill="#fff"/>
		<path d="M78 43 Q79 56 89 63 L102 63 L102 36 Z" fill="#101824" clip-path="url(#mascot-body)"/>
		<ellipse cx="64" cy="55" rx="27" ry="15.5" transform="rotate(-12 64 55)" fill="none" stroke="#101824" stroke-width="2"/>
		<path d="M38 58 Q45 42 68 38 Q79 36.5 86 41 Q76 50 60 55 Q48 58.5 38 58 Z" fill="#9aa3ab" stroke="#101824" stroke-width="2" stroke-linejoin="round"/>
		<g><path d="M77 46 Q61 45.5 49 53 Q42 57.5 36 62 Q52 64.5 66 58 Q74 54 77 46 Z" fill="#3d444b" stroke="#101824" stroke-width="1.8" stroke-linejoin="round"/><path d="M44 60 Q56 53 70 50.5 M50 61.5 Q60 57 69 55" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none"/></g>
		<circle cx="89" cy="33" r="12.5" fill="#fff" stroke="#101824" stroke-width="2"/>
		<path d="M94 21.5 A12.5 12.5 0 0 0 77.3 37.8 Q83.5 36 85.5 30 Q87.5 24.5 94 21.5 Z" fill="#101824" stroke="#101824" stroke-width="1.6" stroke-linejoin="round"/>
		<circle cx="93.5" cy="31" r="2.3" fill="#101824"/>
		<circle cx="94.3" cy="30.2" r="0.8" fill="#fff"/>
		<path d="M101 30.6 L112.5 32.6 L100.8 34.6 Z" fill="#101824" stroke="#101824" stroke-width="1" stroke-linejoin="round"/>
	</g>`;

/** Bird scaled into a square; `padding` keeps it inside the maskable safe zone. */
function iconSvg(size: number, padding: number, rounded: boolean): string {
	const inner = size * (1 - 2 * padding);
	const scale = inner / 120;
	const offsetX = (size - 120 * scale) / 2;
	const offsetY = (size - 100 * scale) / 2;
	const radius = rounded ? size * 0.22 : 0;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
		<rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
		<g transform="translate(${offsetX} ${offsetY}) scale(${scale})">${BIRD}</g>
	</svg>`;
}

async function main(): Promise<void> {
	await mkdir(OUT, { recursive: true });
	const browser = await chromium.launch();
	const page = await browser.newPage({ deviceScaleFactor: 1 });
	const targets = [
		{ file: 'icon-192.png', size: 192, padding: 0.1, rounded: true },
		{ file: 'icon-512.png', size: 512, padding: 0.1, rounded: true },
		{ file: 'icon-maskable-512.png', size: 512, padding: 0.2, rounded: false },
		{ file: 'apple-touch-icon.png', size: 180, padding: 0.12, rounded: false }
	];
	for (const target of targets) {
		await page.setViewportSize({ width: target.size, height: target.size });
		await page.setContent(`<html><body style="margin:0;background:transparent">${iconSvg(target.size, target.padding, target.rounded)}</body></html>`);
		await page.locator('svg').screenshot({ path: path.join(OUT, target.file), omitBackground: true });
	}
	await browser.close();

	const lv = JSON.parse(await readFile(path.join(ROOT, 'locales/lv.json'), 'utf8')) as { app: { name: string; description: string } };
	const manifest = {
		name: lv.app.name,
		short_name: lv.app.name,
		description: lv.app.description,
		lang: 'lv',
		dir: 'ltr',
		start_url: './',
		scope: './',
		display: 'standalone',
		orientation: 'portrait',
		background_color: BG,
		theme_color: BG,
		categories: ['entertainment', 'lifestyle', 'travel'],
		icons: [
			{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
		]
	};
	await writeFile(path.join(ROOT, 'static/manifest.webmanifest'), `${JSON.stringify(manifest, null, '\t')}\n`);
	console.log(`Wrote ${targets.length} icons and manifest.webmanifest`);
}

await main();
