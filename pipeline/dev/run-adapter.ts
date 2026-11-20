/**
 * Runs one or more adapters live and prints a summary. For development only.
 *   npx tsx pipeline/dev/run-adapter.ts fienta
 *   npx tsx pipeline/dev/run-adapter.ts fienta --json > /tmp/out.json
 * Flagged adapters run only with their flag set, e.g. SOURCE_BILESUSERVISS=1.
 */
import path from 'node:path';
import { isEnabled, loadAdapters } from '../adapters/registry';
import { createHttp } from '../lib/http';

const args = process.argv.slice(2);
const ids = args.filter((arg) => !arg.startsWith('--'));
const asJson = args.includes('--json');
const cacheDir = path.resolve('data/cache/http');

const adapters = await loadAdapters(ids.length ? ids : undefined);
if (adapters.length === 0) {
	console.error(`No adapters match: ${ids.join(', ')}`);
	process.exit(1);
}

const http = createHttp({ cacheDir, cacheTtlMs: 6 * 3600_000, log: (m) => console.error(`[http] ${m}`) });
for (const adapter of adapters) {
	if (!isEnabled(adapter)) {
		console.error(`${adapter.id}: disabled (set ${adapter.flag}=1). ${adapter.flagReason ?? ''}`);
		continue;
	}
	const started = Date.now();
	try {
		const events = await adapter.fetch({
			http,
			now: new Date(),
			horizonDays: 120,
			log: (m) => console.error(`[${adapter.id}] ${m}`)
		});
		if (asJson) {
			console.log(JSON.stringify(events, null, 2));
			continue;
		}
		console.error(`${adapter.id}: ${events.length} events in ${Date.now() - started} ms`);
		for (const event of events.slice(0, 3)) console.error(JSON.stringify(event, null, 2));
	} catch (error) {
		console.error(`${adapter.id}: FAILED ${(error as Error).stack ?? error}`);
		process.exitCode = 1;
	}
}
