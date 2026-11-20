import { describe, expect, test } from 'vitest';
import { answered, dismissed, nextQuestion } from './ask';
import { defaultProfile, type Profile } from './profile';

const now = new Date('2026-11-20T10:00:00Z');
const ctx = { now, canInstall: false, canLocate: true, shownThisSession: false };

function profile(partial: Partial<Profile>): Profile {
	return { ...defaultProfile(now), onboarded: true, sessions: 2, ...partial };
}

describe('nextQuestion', () => {
	test('asks nothing in the first session or twice in one session', () => {
		expect(nextQuestion(profile({ sessions: 1 }), ctx)).toBeUndefined();
		expect(nextQuestion(profile({}), { ...ctx, shownThisSession: true })).toBeUndefined();
	});

	test('asks for location before anything else when it is missing', () => {
		expect(nextQuestion(profile({ placeId: 'Q1773' }), ctx)).toBe('location');
	});

	test('asks for kids ages only after family interest shows', () => {
		const family = profile({ companions: ['family'], geo: { lat: 56.95, lng: 24.1, at: now.toISOString() }, opens: { gimenem: 2 } });
		expect(nextQuestion(family, ctx)).toBe('kids');
	});

	test('rests a question dismissed twice and never repeats an answered one', () => {
		let p = profile({ placeId: 'Q1773' });
		p = { ...p, ...dismissed(p, 'location', now) };
		expect(nextQuestion(p, ctx)).toBe('location');
		p = { ...p, ...dismissed(p, 'location', now) };
		expect(nextQuestion(p, ctx)).toBe('apkaime');
		p = { ...p, ...answered(p, 'apkaime', now) };
		expect(nextQuestion(p, ctx)).toBeUndefined();
	});
});
