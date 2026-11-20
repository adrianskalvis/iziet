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
	<path d="M34 60 L6 46 Q2 44 6 42 L38 52 Z" fill="#101824" stroke="#101824" stroke-width="2" stroke-linejoin="round"/>
	<path d="M9 44 L33 54" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
	<path d="M54 82 L51 94 M63 82 L65 94 M47 94 H55 M61 94 H69" stroke="#101824" stroke-width="2.6" stroke-linecap="round"/>
	<ellipse cx="57" cy="64" rx="30" ry="19" fill="#9aa2a9" stroke="#101824" stroke-width="2"/>
	<path d="M38 68 Q56 90 82 70 Q80 58 68 56 Q50 58 38 68 Z" fill="#fff" stroke="#101824" stroke-width="2" stroke-linejoin="round"/>
	<path d="M41 61 Q55 50 69 61 Q56 69 41 61 Z" fill="#5e666d" stroke="#101824" stroke-width="2" stroke-linejoin="round"/>
	<path d="M70 48 Q86 49 88 61 Q79 67 69 60 Z" fill="#101824"/>
	<circle cx="83" cy="37" r="18" fill="#fff" stroke="#101824" stroke-width="2"/>
	<path d="M66 33 Q69 17 86 19 Q100 21 100 32 Q89 26 77 29 Q70 31 66 33 Z" fill="#101824"/>
	<circle cx="89" cy="37" r="3.6" fill="#101824"/>
	<circle cx="90.3" cy="35.7" r="1.2" fill="#fff"/>
	<ellipse cx="85" cy="45.5" rx="3.6" ry="2" fill="#f2a7b1" opacity="0.85"/>
	<path d="M99.5 39 L109 41.5 L99.5 44 Z" fill="#101824"/>`;

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
		start_url: '/',
		scope: '/',
		display: 'standalone',
		orientation: 'portrait',
		background_color: BG,
		theme_color: BG,
		categories: ['entertainment', 'lifestyle', 'travel'],
		icons: [
			{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
		]
	};
	await writeFile(path.join(ROOT, 'static/manifest.webmanifest'), `${JSON.stringify(manifest, null, '\t')}\n`);
	console.log(`Wrote ${targets.length} icons and manifest.webmanifest`);
}

await main();
