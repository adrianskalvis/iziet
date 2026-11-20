import { describe, expect, test } from 'vitest';
import type { DataMeta, SourceStatus } from '../src/lib/shared/types';
import { findStaleSources, healthReport } from './health';

const now = new Date('2026-12-01T12:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 3600_000).toISOString();

function source(id: string, patch: Partial<SourceStatus> = {}): SourceStatus {
	return { id, name: id.toUpperCase(), homepage: `https://${id}.lv`, state: 'ok', count: 10, lastOkAt: daysAgo(0), ...patch };
}

function meta(sources: SourceStatus[]): DataMeta {
	return { generatedAt: now.toISOString(), count: 100, sources };
}

describe('findStaleSources', () => {
	test('flags a source with no fresh data for 3 days and a relay source after 10 days', () => {
		const stale = findStaleSources(
			meta([
				source('fresh'),
				source('liepaja', { state: 'failed', count: 0, lastOkAt: daysAgo(4) }),
				source('lnso', { state: 'cached', lastOkAt: daysAgo(6) }),
				source('apollo-kino', { state: 'cached', lastOkAt: daysAgo(12) })
			]),
			now,
			['lnso', 'apollo-kino']
		);
		expect(stale).toEqual([
			{ id: 'apollo-kino', name: 'APOLLO-KINO', days: 12, relay: true },
			{ id: 'liepaja', name: 'LIEPAJA', days: 4, relay: false }
		]);
	});

	test('leaves out sources that never had events, are switched off, or went quiet over 45 days ago', () => {
		const stale = findStaleSources(
			meta([
				source('never', { state: 'failed', count: 0, lastOkAt: undefined }),
				source('off', { state: 'disabled', count: 0, lastOkAt: daysAgo(20) }),
				source('seasonal', { state: 'failed', count: 0, lastOkAt: daysAgo(60) })
			]),
			now,
			[]
		);
		expect(stale).toEqual([]);
	});
});

describe('healthReport', () => {
	test('is empty when every source is fresh', () => {
		expect(healthReport(meta([source('fresh')]), now, [])).toBe('');
	});

	test('names each stale source and says what to do', () => {
		const report = healthReport(
			meta([source('liepaja', { state: 'failed', count: 0, lastOkAt: daysAgo(4) }), source('lnso', { state: 'cached', lastOkAt: daysAgo(11) })]),
			now,
			['lnso']
		);
		expect(report).toContain('`liepaja` (LIEPAJA): no fresh events for 4 days');
		expect(report).toContain('search for `liepaja`');
		expect(report).toContain('`lnso` (LNSO): relay data is 11 days old');
		expect(report).toContain('npm run data:relay');
	});
});
