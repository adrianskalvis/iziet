import { defineConfig, devices } from '@playwright/test';

/** End-to-end tests run against the production build at 390×844 (iPhone 14 size). */
export default defineConfig({
	testDir: 'e2e',
	timeout: 30_000,
	retries: 1,
	reporter: [['list']],
	use: {
		baseURL: 'http://localhost:4173',
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		locale: 'lv-LV',
		timezoneId: 'Europe/Riga',
		serviceWorkers: 'allow'
	},
	projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } }],
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: true,
		timeout: 120_000
	}
});
