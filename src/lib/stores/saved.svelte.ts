import { browser } from '$app/environment';

const SAVED_KEY = 'iziet.saved.v1';

function read(): string[] {
	if (!browser) return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

/** Saved event ids, newest first, stored in this browser only. */
class SavedStore {
	ids = $state.raw<string[]>(read());

	has(id: string): boolean {
		return this.ids.includes(id);
	}

	toggle(id: string): boolean {
		const saved = !this.has(id);
		this.ids = saved ? [id, ...this.ids] : this.ids.filter((existing) => existing !== id);
		if (browser) {
			try {
				localStorage.setItem(SAVED_KEY, JSON.stringify(this.ids));
			} catch (error) {
				console.warn('Saved list could not be stored', error);
			}
		}
		return saved;
	}
}

export const savedStore = new SavedStore();
