import { browser } from '$app/environment';
import { defaultProfile, parseProfile, PROFILE_KEY, type Profile } from '../profile';

/**
 * The profile lives in localStorage only. Every change replaces the object
 * (no in-place mutation) and is written back at once.
 */

function read(): Profile {
	if (!browser) return defaultProfile();
	try {
		const raw = localStorage.getItem(PROFILE_KEY);
		return raw ? parseProfile(JSON.parse(raw)) : defaultProfile();
	} catch {
		return defaultProfile();
	}
}

function write(profile: Profile): void {
	if (!browser) return;
	try {
		localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
	} catch (error) {
		console.warn('Profile could not be saved', error);
	}
}

class ProfileStore {
	value = $state.raw<Profile>(read());

	update(patch: Partial<Profile> | ((current: Profile) => Partial<Profile>)): void {
		const changes = typeof patch === 'function' ? patch(this.value) : patch;
		const next: Profile = { ...this.value, ...changes, updatedAt: new Date().toISOString() };
		this.value = next;
		write(next);
		if (browser) {
			document.documentElement.classList.toggle('text-large', next.textSize === 'large');
			document.documentElement.classList.toggle('first-visit', !next.onboarded);
		}
	}

	/** Counts a new session once per 30 minutes of inactivity. */
	touchSession(now = new Date()): void {
		const last = this.value.lastSessionAt ? Date.parse(this.value.lastSessionAt) : 0;
		if (now.getTime() - last > 30 * 60_000) {
			this.update((p) => ({ sessions: p.sessions + 1, lastSessionAt: now.toISOString() }));
		} else {
			this.update({ lastSessionAt: now.toISOString() });
		}
	}

	reset(): void {
		const fresh = defaultProfile();
		this.value = fresh;
		if (browser) {
			try {
				localStorage.removeItem(PROFILE_KEY);
			} catch {
				// Storage blocked: the in-memory reset still applies.
			}
			document.documentElement.classList.add('first-visit');
			document.documentElement.classList.remove('text-large');
		}
	}
}

export const profileStore = new ProfileStore();
