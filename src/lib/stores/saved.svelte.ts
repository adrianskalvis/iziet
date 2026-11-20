import { browser } from '$app/environment';

const SAVED_KEY = 'iziet.saved.v1';
const SNAPSHOT_KEY = 'iziet.savedInfo.v1';
const MAX_SAVED = 500;

/** Enough to list a saved event after it has left the data file. */
export interface SavedSnapshot {
	title: string;
	start: string;
	town: string;
}

function readJson<T>(key: string, fallback: T): T {
	if (!browser) return fallback;
	try {
		return (JSON.parse(localStorage.getItem(key) ?? 'null') as T) ?? fallback;
	} catch {
		return fallback;
	}
}

function writeJson(key: string, value: unknown): void {
	if (!browser) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.warn('Saved list could not be stored', error);
	}
}

/** Saved event ids, newest first, with a small snapshot each; this browser only. */
class SavedStore {
	ids = $state.raw<string[]>(readJson<unknown[]>(SAVED_KEY, []).filter((id): id is string => typeof id === 'string'));
	snapshots = $state.raw<Record<string, SavedSnapshot>>(readJson(SNAPSHOT_KEY, {}));

	has(id: string): boolean {
		return this.ids.includes(id);
	}

	toggle(id: string, snapshot?: SavedSnapshot): boolean {
		const saved = !this.has(id);
		this.ids = saved ? [id, ...this.ids].slice(0, MAX_SAVED) : this.ids.filter((existing) => existing !== id);
		const { [id]: _removed, ...rest } = this.snapshots;
		this.snapshots = saved && snapshot ? { ...rest, [id]: snapshot } : rest;
		writeJson(SAVED_KEY, this.ids);
		writeJson(SNAPSHOT_KEY, this.snapshots);
		return saved;
	}
}

export const savedStore = new SavedStore();
