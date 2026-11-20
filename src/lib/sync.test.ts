import { describe, expect, test } from 'vitest';
import { defaultProfile } from './profile';
import { forUpload, mergePayloads, syncConfig } from './sync';

describe('sync flag', () => {
	test('stays off unless the flag and both keys are set', () => {
		expect(syncConfig({})).toBeNull();
		expect(syncConfig({ VITE_FEATURE_SYNC: '1', VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
		expect(syncConfig({ VITE_FEATURE_SYNC: '1', VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({
			url: 'https://x.supabase.co',
			anonKey: 'k'
		});
	});
});

describe('mergePayloads', () => {
	const geo = { lat: 56.95, lng: 24.1, at: '2026-11-20T10:00:00Z' };

	test('keeps the newer profile, the local location and the union of saved events', () => {
		const older = { ...defaultProfile(), cats: ['koncerti' as const], geo, apkaime: 'centrs', updatedAt: '2026-11-01T00:00:00Z' };
		const newer = { ...defaultProfile(), cats: ['sports' as const], updatedAt: '2026-11-10T00:00:00Z' };
		const merged = mergePayloads({ profile: older, saved: ['a'] }, { profile: newer, saved: ['b', 'a'] });
		expect(merged.profile.cats).toEqual(['sports']);
		expect(merged.profile.geo).toEqual(geo);
		expect(merged.profile.apkaime).toBe('centrs');
		expect(merged.saved.sort()).toEqual(['a', 'b']);
	});

	test('ignores malformed remote data', () => {
		const local = { profile: defaultProfile(), saved: ['a'] };
		expect(mergePayloads(local, 'nonsense')).toBe(local);
		expect(mergePayloads(local, { profile: { v: 1 }, saved: 'x' }).saved).toEqual(['a']);
	});
});

describe('forUpload', () => {
	test('never uploads location', () => {
		const profile = { ...defaultProfile(), geo: { lat: 1, lng: 2, at: 'x' }, apkaime: 'centrs' };
		const payload = forUpload({ profile, saved: [] });
		expect(payload.profile).not.toHaveProperty('geo');
		expect(payload.profile).not.toHaveProperty('apkaime');
	});
});
