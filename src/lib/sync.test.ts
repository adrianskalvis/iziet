import { describe, expect, test } from 'vitest';
import { defaultProfile } from './profile';
import { mergePayloads, syncConfig } from './sync';

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
	test('keeps the newer profile and the union of saved events', () => {
		const older = { ...defaultProfile(), cats: ['koncerti' as const], updatedAt: '2026-11-01T00:00:00Z' };
		const newer = { ...defaultProfile(), cats: ['sports' as const], updatedAt: '2026-11-10T00:00:00Z' };
		const merged = mergePayloads({ profile: older, saved: ['a'] }, { profile: newer, saved: ['b', 'a'] });
		expect(merged.profile.cats).toEqual(['sports']);
		expect(merged.saved.sort()).toEqual(['a', 'b']);
		expect(mergePayloads({ profile: newer, saved: [] }, { profile: older, saved: [] }).profile.cats).toEqual(['sports']);
	});
});
