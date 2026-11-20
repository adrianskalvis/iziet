import { browser } from '$app/environment';

class UiStore {
	menuOpen = $state(false);
	/** In-app navigations so far; above 1 means "back" stays inside the app. */
	navCount = 0;
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
