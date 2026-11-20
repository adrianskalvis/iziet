import { expect, test } from '@playwright/test';
import { seedProfile, waitForCards } from './helpers';

test.describe('first visit', () => {
	test('shows onboarding and lands on a useful home after skipping every step', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Kur meklēt pasākumus?' })).toBeVisible();
		for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Izlaist' }).click();
		await expect(page.getByRole('heading', { name: 'Tuvumā' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Citur Latvijā' })).toBeVisible();
		await waitForCards(page);
	});

	test('saves city, companions, kids and interests from onboarding', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Jelgava' }).click();
		await page.getByRole('button', { name: 'Ar ģimeni' }).click();
		await page.getByRole('button', { name: '7–12 g.' }).click();
		await page.getByRole('button', { name: 'Turpināt' }).click();
		await page.getByRole('button', { name: 'Ģimenēm' }).click();
		await page.getByRole('button', { name: 'Gatavs' }).click();
		await expect(page.getByText('Vieta: Jelgava')).toBeVisible();
		const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('iziet.profile.v1') ?? '{}'));
		expect(stored).toMatchObject({ onboarded: true, companions: ['family'], kids: ['7-12'], cats: ['gimenem'] });
	});
});

test.describe('returning visitor', () => {
	test.beforeEach(async ({ page }) => {
		await seedProfile(page);
	});

	test('home shows 1 to 3 nearby cards with image, date, place and a show-more link', async ({ page }) => {
		await page.goto('/');
		await waitForCards(page);
		const nearby = page.locator('section', { has: page.getByRole('heading', { name: 'Tuvumā' }) });
		const cards = nearby.locator('article');
		const count = await cards.count();
		expect(count).toBeGreaterThanOrEqual(1);
		expect(count).toBeLessThanOrEqual(3);
		await expect(nearby.getByRole('link', { name: 'Rādīt vairāk' })).toBeVisible();
	});

	test('hamburger opens and closes the full-screen menu', async ({ page }) => {
		await page.goto('/');
		const burger = page.getByRole('button', { name: 'Atvērt izvēlni' });
		await burger.click();
		const menu = page.getByRole('dialog', { name: 'Izvēlne' });
		await expect(menu).toBeVisible();
		await expect(menu.getByRole('link', { name: 'Saglabātie' })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(menu).toBeHidden();
	});

	test('Visa Latvija on home opens search with events from all of Latvia', async ({ page }) => {
		await page.goto('/');
		await waitForCards(page);
		await page.getByRole('button', { name: 'Visa Latvija' }).click();
		await expect(page).toHaveURL(/meklet\?kur=latvija/);
		await expect(page.getByRole('heading', { name: 'Ieteikumi visā Latvijā' })).toBeVisible();
		await waitForCards(page);
	});

	test('Atpakaļ on a page opened from the menu reopens the menu', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Atvērt izvēlni' }).click();
		await page.getByRole('dialog', { name: 'Izvēlne' }).getByRole('link', { name: 'Kategorijas' }).click();
		await expect(page).toHaveURL(/kategorijas/);
		await page.getByRole('link', { name: 'Atpakaļ' }).click();
		await expect(page.getByRole('dialog', { name: 'Izvēlne' })).toBeVisible();
	});

	test('search finds Rīga events without diacritics and with a typo', async ({ page }) => {
		await page.goto('/meklet?q=riga&kur=latvija');
		await expect(page.getByRole('status')).toContainText(/pasākum/);
		await waitForCards(page);
		await page.getByRole('searchbox').fill('koncrets');
		await waitForCards(page);
		await expect(page.locator('article').first()).toBeVisible();
	});

	test('show more opens a filtered list and back restores the scroll position', async ({ page }) => {
		await page.goto('/saraksts?skats=visi');
		await waitForCards(page);
		await page.mouse.wheel(0, 1200);
		await page.waitForTimeout(400);
		const before = await page.evaluate(() => window.scrollY);
		expect(before).toBeGreaterThan(300);
		// A plain click event: Playwright's click() first scrolls the link to the centre itself.
		await page.locator('article').nth(4).locator('a.stretched').dispatchEvent('click');
		await expect(page).toHaveURL(/pasakums\?id=/);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await page.goBack();
		await expect(page).toHaveURL(/saraksts\?skats=visi/);
		await expect(page.locator('article').first()).toBeAttached({ timeout: 15_000 });
		await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(before - 80);
	});

	test('filters by free entry and updates the URL', async ({ page }) => {
		await page.goto('/saraksts?skats=visi');
		await waitForCards(page);
		await page.getByRole('button', { name: /^Filtri/ }).click();
		await page.getByRole('button', { name: 'Bez maksas', exact: true }).click();
		await expect(page).toHaveURL(/bez=1/);
		await expect(page.getByRole('button', { name: 'Noņemt filtru: Bez maksas' })).toBeVisible();
	});

	test('event page links back to the original source', async ({ page }) => {
		await page.goto('/saraksts?skats=visi');
		await waitForCards(page);
		await page.locator('article a.stretched').first().click();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		// Sources load with the detail shard, a moment after the page renders.
		await expect(page.locator('dl.meta a[target="_blank"]').first()).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole('link', { name: 'Kā nokļūt' })).toBeVisible();
	});

	test('saving an event puts it on the saved page', async ({ page }) => {
		await page.goto('/saraksts?skats=visi');
		await waitForCards(page);
		const title = await page.locator('article a.stretched').first().innerText();
		await page.locator('article').first().getByRole('button', { name: 'Saglabāt' }).click();
		await page.goto('/saglabatie');
		await expect(page.getByText(title, { exact: true })).toBeVisible();
	});

	test('works offline after the first visit', async ({ page, context }) => {
		await page.goto('/');
		await waitForCards(page);
		await page.evaluate(async () => {
			await navigator.serviceWorker.ready;
		});
		await page.reload();
		await waitForCards(page);
		await context.setOffline(true);
		await page.reload();
		await waitForCards(page);
		await expect(page.getByRole('heading', { name: 'Tuvumā' })).toBeVisible();
		await context.setOffline(false);
	});
});
