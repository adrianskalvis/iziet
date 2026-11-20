import { browser } from '$app/environment';

class UiStore {
	menuOpen = $state(false);
	/** In-app navigations so far; above 1 means "back" stays inside the app. */
	navCount = 0;
	/** Path of the page last opened from the menu; "Atpakaļ" there reopens the menu. */
	menuOrigin: string | null = null;
	/** Set by a menu link click, consumed by the next navigation. */
	navFromMenu = false;
	online = $state(browser ? navigator.onLine : true);
	toast = $state<string | null>(null);
	/** Deferred install prompt (Chrome and Android). */
	installPrompt = $state.raw<(Event & { prompt: () => Promise<void> }) | null>(null);
	#toastTimer: ReturnType<typeof setTimeout> | undefined;

	showToast(message: string, ms = 2600): void {
		this.toast = message;
		clearTimeout(this.#toastTimer);
		this.#toastTimer = setTimeout(() => (this.toast = null), ms);
	}
}

export const ui = new UiStore();
