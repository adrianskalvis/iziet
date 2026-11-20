import { test } from '@playwright/test';
import { seedProfile, waitForCards } from './helpers';

/** Saves 390×844 screenshots of the main screens to screenshots/ for review. */

const DIR = 'screenshots';

test('onboarding screens', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('heading', { name: 'Kur meklēt pasākumus?' }).waitFor();
	await page.screenshot({ path: `${DIR}/01-onboarding-place.png` });
	await page.getByRole('button', { name: 'Rīga' }).click();
	await page.getByRole('button', { name: 'Ar ģimeni' }).click();
	await page.screenshot({ path: `${DIR}/02-onboarding-companions.png` });
	await page.getByRole('button', { name: 'Turpināt' }).click();
	await page.getByRole('button', { name: 'Koncerti' }).click();
	await page.getByRole('button', { name: 'Vēl intereses' }).click();
	await page.screenshot({ path: `${DIR}/03-onboarding-interests.png` });
});

test.describe('returning visitor screens', () => {
	test.beforeEach(async ({ page }) => {
		await seedProfile(page, { apkaime: 'centrs', companions: ['friends'] });
	});

	test('home, menu, list, event, search, categories, about', async ({ page }) => {
		await page.goto('/');
		await waitForCards(page);
		await page.waitForTimeout(800);
		await page.screenshot({ path: `${DIR}/04-home.png` });
		await page.screenshot({ path: `${DIR}/05-home-full.png`, fullPage: true });

		await page.getByRole('button', { name: 'Visa Latvija' }).click();
		await page.getByRole('heading', { name: 'Visā Latvijā' }).waitFor();
		await page.waitForTimeout(600);
		await page.screenshot({ path: `${DIR}/04b-home-latvia.png`, fullPage: true });
		await page.getByRole('button', { name: 'Tuvumā', exact: true }).click();

		await page.getByRole('button', { name: 'Atvērt izvēlni' }).click();
		await page.waitForTimeout(400);
		await page.screenshot({ path: `${DIR}/06-menu.png` });
		await page.keyboard.press('Escape');

		await page.goto('/saraksts?skats=tuvuma');
		await waitForCards(page);
		await page.waitForTimeout(600);
		await page.screenshot({ path: `${DIR}/07-list-nearby.png` });
		await page.getByRole('button', { name: /^Filtri/ }).click();
		await page.waitForTimeout(300);
		await page.screenshot({ path: `${DIR}/07b-list-filters.png` });
		await page.getByRole('button', { name: /^Rādīt rezultātus/ }).click();

		await page.locator('article a.stretched').first().click();
		await page.getByRole('heading', { level: 1 }).waitFor();
		await page.waitForTimeout(800);
		await page.screenshot({ path: `${DIR}/08-event.png` });
		await page.screenshot({ path: `${DIR}/09-event-full.png`, fullPage: true });

		await page.goto('/meklet?kur=latvija');
		await waitForCards(page);
		await page.waitForTimeout(600);
		await page.screenshot({ path: `${DIR}/10b-search-latvija.png` });
		await page.goto('/meklet?q=jurmala&kur=latvija');
		await waitForCards(page);
		await page.waitForTimeout(600);
		await page.screenshot({ path: `${DIR}/10-search.png` });

		await page.goto('/kategorijas');
		await page.waitForTimeout(600);
		await page.screenshot({ path: `${DIR}/11-categories.png` });

		await page.goto('/par');
		await page.waitForTimeout(600);
		await page.screenshot({ path: `${DIR}/12-about.png` });
	});

	test('dark mode home', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		await waitForCards(page);
		await page.waitForTimeout(800);
		await page.screenshot({ path: `${DIR}/13-home-dark.png` });
	});
});
