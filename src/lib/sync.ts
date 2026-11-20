import { browser } from '$app/environment';
import { parseProfile, type Profile } from './profile';

/**
 * Optional cross-device sync, OFF unless all three build variables are set:
 *   VITE_FEATURE_SYNC=1, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Sign-in uses Supabase Auth (Google or Apple) with a redirect; the profile is one
 * JSON row per user (schema and row-level security in docs/sync.sql).
 * No SDK: plain fetch keeps the bundle small, and the code loads only when enabled.
 */

const SESSION_KEY = 'iziet.session.v1';

export interface SyncConfig {
	url: string;
	anonKey: string;
}

export interface Session {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
	email?: string;
}

export interface SyncPayload {
	profile: Profile;
	saved: string[];
}

export function syncConfig(env: Record<string, string | undefined> = import.meta.env): SyncConfig | null {
	if (env.VITE_FEATURE_SYNC !== '1' || !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return null;
	return { url: env.VITE_SUPABASE_URL.replace(/\/$/, ''), anonKey: env.VITE_SUPABASE_ANON_KEY };
}

/** Newer profile wins; saved events are the union of both lists. */
export function mergePayloads(local: SyncPayload, remote: SyncPayload | null): SyncPayload {
	if (!remote) return local;
	const remoteNewer = Date.parse(remote.profile.updatedAt) > Date.parse(local.profile.updatedAt);
	return {
		profile: remoteNewer ? parseProfile(remote.profile) : local.profile,
		saved: [...new Set([...local.saved, ...remote.saved])]
	};
}

export function startSignIn(config: SyncConfig, provider: 'google' | 'apple'): void {
	const redirect = `${window.location.origin}${window.location.pathname}`;
	window.location.href = `${config.url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirect)}`;
}

/** Reads tokens from the redirect hash after sign-in and stores the session. */
export function consumeRedirect(): Session | null {
	if (!browser || !window.location.hash.includes('access_token=')) return readSession();
	const params = new URLSearchParams(window.location.hash.slice(1));
	const accessToken = params.get('access_token');
	if (!accessToken) return readSession();
	const session: Session = {
		accessToken,
		refreshToken: params.get('refresh_token') ?? undefined,
		expiresAt: Date.now() + Number(params.get('expires_in') ?? 3600) * 1000
	};
	history.replaceState(history.state, '', window.location.pathname + window.location.search);
	try {
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	} catch {
		// Storage blocked: the session lasts for this page only.
	}
	return session;
}

export function readSession(): Session | null {
	if (!browser) return null;
	try {
		const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
		return session && session.expiresAt > Date.now() ? session : null;
	} catch {
		return null;
	}
}

export function signOut(): void {
	try {
		localStorage.removeItem(SESSION_KEY);
	} catch {
		// Nothing stored.
	}
}

function headers(config: SyncConfig, session: Session): Record<string, string> {
	return { apikey: config.anonKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' };
}

export async function pull(config: SyncConfig, session: Session): Promise<SyncPayload | null> {
	const response = await fetch(`${config.url}/rest/v1/profiles?select=data`, { headers: headers(config, session) });
	if (!response.ok) throw new Error(`Sync pull failed: HTTP ${response.status}`);
	const rows = (await response.json()) as Array<{ data: SyncPayload }>;
	return rows[0]?.data ?? null;
}

export async function push(config: SyncConfig, session: Session, payload: SyncPayload): Promise<void> {
	const response = await fetch(`${config.url}/rest/v1/profiles`, {
		method: 'POST',
		headers: { ...headers(config, session), Prefer: 'resolution=merge-duplicates' },
		body: JSON.stringify({ data: payload })
	});
	if (!response.ok) throw new Error(`Sync push failed: HTTP ${response.status}`);
}
