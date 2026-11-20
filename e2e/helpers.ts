import type { Page } from '@playwright/test';

/** Stores a finished profile before the app loads, so tests can start on the home screen. */
export async function seedProfile(page: Page, patch: Record<string, unknown> = {}): Promise<void> {
	const profile = {
		v: 1,
		onboarded: true,
		placeId: 'Q1773',
		companions: [],
		kids: [],
		cats: ['koncerti', 'teatris'],
		tags: [],
		less: [],
		textSize: 'normal',
		asked: {},
		sessions: 1,
		opens: {},
		elsewhereOpens: 0,
		updatedAt: new Date().toISOString(),
		...patch
	};
	await page.addInitScript((value) => {
		if (!localStorage.getItem('iziet.profile.v1')) localStorage.setItem('iziet.profile.v1', value);
	}, JSON.stringify(profile));
}

/** Waits until event cards have rendered. */
export async function waitForCards(page: Page): Promise<void> {
	await page.locator('article').first().waitFor({ state: 'visible', timeout: 15_000 });
}
