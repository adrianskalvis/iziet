import type { Profile } from './profile';
import { resolveOrigin } from './profile';

/**
 * Progressive profiling (research section 1): at most one question per session,
 * only when it helps, dismissible. A question dismissed twice rests for 30 days.
 */

export type QuestionId = 'location' | 'apkaime' | 'kids' | 'distance' | 'time' | 'price' | 'install';

const REST_MS = 30 * 24 * 3600_000;
const MAX_DISMISSALS = 2;

export interface AskContext {
	now: Date;
	canInstall: boolean;
	canLocate: boolean;
	/** Session number in which a question was already shown this session. */
	shownThisSession: boolean;
}

function eligible(profile: Profile, id: QuestionId, now: Date): boolean {
	const state = profile.asked[id];
	if (!state) return true;
	if (state.answered) return false;
	if (state.count < MAX_DISMISSALS) return true;
	return now.getTime() - Date.parse(state.at) > REST_MS;
}

/** The single question worth asking now, or undefined. Order is by usefulness. */
export function nextQuestion(profile: Profile, ctx: AskContext): QuestionId | undefined {
	if (!profile.onboarded || ctx.shownThisSession || profile.sessions < 2) return undefined;
	const origin = resolveOrigin(profile);
	const familyOpens = profile.opens.gimenem ?? 0;
	const candidates: Array<[QuestionId, boolean]> = [
		['kids', profile.companions.includes('family') && profile.kids.length === 0 && familyOpens >= 2],
		['location', ctx.canLocate && !profile.geo && !profile.apkaime],
		['apkaime', origin.kind === 'riga' && !profile.geo && !profile.apkaime],
		['distance', profile.elsewhereOpens >= 2 && profile.maxTravelMin === undefined],
		['time', profile.sessions >= 3 && !profile.timePref],
		['price', profile.sessions >= 4 && profile.priceMax === undefined],
		['install', ctx.canInstall && profile.sessions >= 2]
	];
	return candidates.find(([id, applies]) => applies && eligible(profile, id, ctx.now))?.[0];
}

/** Profile patch after the user dismissed a question with "Vēlāk". */
export function dismissed(profile: Profile, id: QuestionId, now: Date): Pick<Profile, 'asked'> {
	const previous = profile.asked[id];
	return { asked: { ...profile.asked, [id]: { at: now.toISOString(), count: (previous?.count ?? 0) + 1 } } };
}

/** Profile patch after the user answered a question. */
export function answered(profile: Profile, id: QuestionId, now: Date): Pick<Profile, 'asked'> {
	const previous = profile.asked[id];
	return { asked: { ...profile.asked, [id]: { at: now.toISOString(), count: previous?.count ?? 0, answered: true } } };
}
