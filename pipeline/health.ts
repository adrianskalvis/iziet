/**
 * Source health for the owner. After every data run the Site workflow turns
 * this report into one GitHub issue: opened when a source goes stale, updated
 * while it stays stale, closed when every source is back. No issue means no work.
 */
import type { DataMeta } from '../src/lib/shared/types';
import { FORGET_AFTER_DAYS, RELAY_STALE_AFTER_DAYS, STALE_AFTER_DAYS } from './config';

const DAY_MS = 24 * 3600_000;

export interface StaleSource {
	id: string;
	name: string;
	/** Whole days since the source last gave events. */
	days: number;
	relay: boolean;
}

/**
 * Sources whose newest events are older than the limit: 3 days, or 10 days for
 * relay sources. Sources that never gave events, are switched off, or went quiet
 * more than 45 days ago (seasonal venues) are left out.
 */
export function findStaleSources(meta: DataMeta, now: Date, relayIds: string[]): StaleSource[] {
	return meta.sources
		.filter((source) => source.state !== 'disabled' && source.lastOkAt !== undefined)
		.map((source) => ({
			id: source.id,
			name: source.name,
			days: Math.floor((now.getTime() - Date.parse(source.lastOkAt!)) / DAY_MS),
			relay: relayIds.includes(source.id)
		}))
		.filter((source) => source.days >= (source.relay ? RELAY_STALE_AFTER_DAYS : STALE_AFTER_DAYS) && source.days <= FORGET_AFTER_DAYS)
		.sort((a, b) => b.days - a.days || a.id.localeCompare(b.id));
}

/** Markdown body of the health issue; an empty string when nothing is stale. */
export function healthReport(meta: DataMeta, now: Date, relayIds: string[]): string {
	const stale = findStaleSources(meta, now, relayIds);
	if (stale.length === 0) return '';
	const lines = stale.map((source) =>
		source.relay
			? `- \`${source.id}\` (${source.name}): relay data is ${source.days} days old. Run \`npm run data:relay\` on the owner's computer, or check its schedule with \`sh scripts/relay-install.sh\`.`
			: `- \`${source.id}\` (${source.name}): no fresh events for ${source.days} days. The site probably changed its pages; its adapter is under \`pipeline/adapters\` (search for \`${source.id}\`).`
	);
	return [
		`The data run of ${meta.generatedAt.slice(0, 10)} found ${stale.length} of ${meta.sources.length} sources without fresh events. The site still shows ${meta.count} events.`,
		'',
		...lines,
		'',
		'This issue updates itself after every data run and closes when all sources are back. To fix an adapter, open the repo in Claude Code and paste this issue.'
	].join('\n');
}
