import type { CategoryId, RawEvent } from '../../src/lib/shared/types';
import type { Http } from '../lib/http';

/**
 * Contract for one event source. Each adapter lives in its own folder:
 *   pipeline/adapters/<id>/index.ts   default export: Adapter or Adapter[]
 *   pipeline/adapters/<id>/parse.ts   pure parse functions (no network)
 *   pipeline/adapters/<id>/<id>.test.ts  tests against saved fixtures
 *   pipeline/adapters/<id>/fixtures/  saved responses
 */

export interface AdapterContext {
	http: Http;
	now: Date;
	/** Only return events starting before now + horizonDays. */
	horizonDays: number;
	log: (message: string) => void;
}

export interface Adapter {
	/** Lowercase id, also the folder name for single adapters, e.g. "fienta". */
	id: string;
	/** Display name shown in the app's source list, e.g. "Fienta". */
	name: string;
	/** Public home page of the source, linked from the app. */
	homepage: string;
	kind: 'api' | 'feed' | 'html' | 'curated';
	/**
	 * Environment variable that must equal "1" for this adapter to run.
	 * Used for sources that need written permission first.
	 */
	flag?: string;
	/** Why the adapter is behind a flag, shown in the run log and the about page. */
	flagReason?: string;
	defaultCategory?: CategoryId;
	fetch(ctx: AdapterContext): Promise<RawEvent[]>;
}
