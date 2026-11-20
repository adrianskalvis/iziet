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
	<g class="tail"><path d="M43 63 L6 89 Q3 91 6 93 L46 69 Z" fill="#101824" stroke="#101824" stroke-width="2" stroke-linejoin="round"/><path d="M9 91 L43 68.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>
	<path d="M60 69 L57 92 M69 67 L72 92 M53 92 H60 M68 92 H75" stroke="#3a3f45" stroke-width="2.2" stroke-linecap="round"/>
	<ellipse cx="62" cy="58" rx="27" ry="13" transform="rotate(-22 62 58)" fill="#fff" stroke="#101824" stroke-width="2"/>
	<path d="M37 68 Q47 47 70 44 Q80 42.5 85 46 Q71 54 56 59 Q45 63 37 68 Z" fill="#a3abb2" stroke="#101824" stroke-width="2" stroke-linejoin="round"/>
	<path d="M41 66 Q55 51 77 49.5 Q66 59.5 50 64 Q45 65.5 41 66 Z" fill="#4d555c" stroke="#101824" stroke-width="1.8" stroke-linejoin="round"/>
	<path d="M47 63 Q58 56 70 53 M52 64 Q61 59.5 69 57.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none"/>
	<path d="M78 38 Q89 43 99 37 Q101 48 91 54 Q81 55 76 47 Z" fill="#101824"/>
	<circle cx="88" cy="32" r="12" fill="#fff" stroke="#101824" stroke-width="2"/>
	<path d="M77 37.5 A12 12 0 0 1 95.5 22.6 Q90 25.8 85.5 27 Q79.5 29.8 77 37.5 Z" fill="#101824" stroke="#101824" stroke-width="1.5" stroke-linejoin="round"/>
	<circle cx="92" cy="31" r="2.6" fill="#101824"/>
	<circle cx="93" cy="30" r="0.85" fill="#fff"/>
	<ellipse cx="91.5" cy="37" rx="2.6" ry="1.4" fill="#f2a7b1" opacity="0.85"/>
	<path d="M99.5 30.5 L111 32 L99.5 33.8 Z" fill="#101824" stroke="#101824" stroke-width="1.1" stroke-linejoin="round"/>`;

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
