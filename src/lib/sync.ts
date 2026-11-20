import { browser } from '$app/environment';
import { parseProfile, type Profile } from './profile';

/**
 * Optional cross-device sync, OFF unless all three build variables are set:
 *   VITE_FEATURE_SYNC=1, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Sign-in uses Supabase Auth (Google or Apple) with the PKCE code flow: only the
 * browser that started sign-in holds the verifier, so a link carrying someone
 * else's token cannot sign this browser in. One JSON row per user (docs/sync.sql).
 * Location never leaves the device: geo and apkaime are stripped before upload.
 */

const SESSION_KEY = 'iziet.session.v1';
const VERIFIER_KEY = 'iziet.pkce.v1';
const MAX_SAVED = 500;

export interface SyncConfig {
	url: string;
	anonKey: string;
}

export interface Session {
	accessToken: string;
	expiresAt: number;
}

export interface SyncPayload {
	profile: Profile;
	saved: string[];
}

export function syncConfig(env: Record<string, string | undefined> = import.meta.env): SyncConfig | null {
	if (env.VITE_FEATURE_SYNC !== '1' || !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return null;
	return { url: env.VITE_SUPABASE_URL.replace(/\/$/, ''), anonKey: env.VITE_SUPABASE_ANON_KEY };
}

/** Removes device-only fields before anything leaves the browser. */
export function forUpload(payload: SyncPayload): SyncPayload {
	const { geo: _geo, apkaime: _apkaime, ...profile } = payload.profile;
	return { profile: profile as Profile, saved: payload.saved.slice(0, MAX_SAVED) };
}

function validSaved(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length < 64).slice(0, MAX_SAVED) : [];
}

/** Newer profile wins, but location always stays local; saved events are the union of both lists. */
export function mergePayloads(local: SyncPayload, remote: unknown): SyncPayload {
	if (!remote || typeof remote !== 'object') return local;
	const candidate = remote as { profile?: unknown; saved?: unknown };
	const remoteProfile = parseProfile(candidate.profile);
	const remoteNewer = Date.parse(remoteProfile.updatedAt) > Date.parse(local.profile.updatedAt);
	const profile = remoteNewer ? { ...remoteProfile, geo: local.profile.geo, apkaime: local.profile.apkaime } : local.profile;
	return { profile, saved: [...new Set([...local.saved, ...validSaved(candidate.saved)])].slice(0, MAX_SAVED) };
}

function base64Url(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startSignIn(config: SyncConfig, provider: 'google' | 'apple'): Promise<void> {
	const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
	const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
	sessionStorage.setItem(VERIFIER_KEY, verifier);
	const redirect = `${window.location.origin}${window.location.pathname}`;
	const params = new URLSearchParams({ provider, redirect_to: redirect, code_challenge: challenge, code_challenge_method: 's256' });
	window.location.href = `${config.url}/auth/v1/authorize?${params}`;
}

/**
 * Finishes sign-in when the URL carries ?code= and this browser holds the matching
 * verifier. Tokens in the URL hash (implicit flow) are ignored on purpose.
 */
export async function consumeRedirect(config: SyncConfig): Promise<Session | null> {
	if (!browser) return null;
	const url = new URL(window.location.href);
	const code = url.searchParams.get('code');
	const verifier = sessionStorage.getItem(VERIFIER_KEY);
	if (!code || !verifier) return readSession();
	sessionStorage.removeItem(VERIFIER_KEY);
	url.searchParams.delete('code');
	history.replaceState(history.state, '', url.pathname + url.search);
	const response = await fetch(`${config.url}/auth/v1/token?grant_type=pkce`, {
		method: 'POST',
		headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
		body: JSON.stringify({ auth_code: code, code_verifier: verifier })
	});
	if (!response.ok) throw new Error(`Sign-in failed: HTTP ${response.status}`);
	const body = (await response.json()) as { access_token?: string; expires_in?: number };
	if (!body.access_token) throw new Error('Sign-in failed: no token');
	const session: Session = { accessToken: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
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
		return session && typeof session.accessToken === 'string' && session.expiresAt > Date.now() ? session : null;
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

export async function pull(config: SyncConfig, session: Session): Promise<unknown> {
	const response = await fetch(`${config.url}/rest/v1/profiles?select=data`, { headers: headers(config, session) });
	if (!response.ok) throw new Error(`Sync pull failed: HTTP ${response.status}`);
	const rows = (await response.json()) as Array<{ data: unknown }>;
	return rows[0]?.data ?? null;
}

export async function push(config: SyncConfig, session: Session, payload: SyncPayload): Promise<void> {
	const response = await fetch(`${config.url}/rest/v1/profiles`, {
		method: 'POST',
		headers: { ...headers(config, session), Prefer: 'resolution=merge-duplicates' },
		body: JSON.stringify({ data: forUpload(payload) })
	});
	if (!response.ok) throw new Error(`Sync push failed: HTTP ${response.status}`);
}
