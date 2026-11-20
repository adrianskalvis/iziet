/**
 * npm run data:relay: fetches RELAY_SOURCES from this computer and writes
 * data/relay/<id>.json for the GitHub run (see relay.ts). Uses the same polite
 * HTTP client as the main run. Exits with code 1 when no source answered.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isEnabled, loadAdapters } from './adapters/registry';
import type { Adapter } from './adapters/types';
import { HORIZON_DAYS } from './config';
import { createHttp } from './lib/http';
import { RELAY_DIR, RELAY_SOURCES, scrubContacts, type SourceResult } from './relay';

const log = (message: string) => console.log(message);

async function relaySource(adapter: Adapter, now: Date): Promise<boolean> {
	const http = createHttp({ log: (m) => log(`  [http] ${m}`) });
	try {
		const events = await adapter.fetch({ http, now, horizonDays: HORIZON_DAYS, log: (m) => log(`  [${adapter.id}] ${m}`) });
		if (events.length === 0) {
			log(`✗ ${adapter.id}: no events, relay file left as it was`);
			return false;
		}
		const result: SourceResult = { fetchedAt: new Date().toISOString(), events: events.map(scrubContacts) };
		await writeFile(path.join(RELAY_DIR, `${adapter.id}.json`), JSON.stringify(result));
		log(`✓ ${adapter.id}: ${events.length} events`);
		return true;
	} catch (error) {
		log(`✗ ${adapter.id}: ${(error as Error).message}`);
		return false;
	}
}

if (process.argv.includes('--ids')) {
	// scripts/relay.sh reads the list from here, so it is written down once.
	console.log(RELAY_SOURCES.join(','));
	process.exit(0);
}

const now = new Date();
await mkdir(RELAY_DIR, { recursive: true });
const adapters = (await loadAdapters(RELAY_SOURCES)).filter((adapter) => isEnabled(adapter));
const answered: boolean[] = [];
for (const adapter of adapters) answered.push(await relaySource(adapter, now));
log(`${answered.filter(Boolean).length} of ${adapters.length} relay sources answered`);
if (!answered.some(Boolean)) process.exitCode = 1;
