import { base } from '$app/paths';
import { shardOf, type DataMeta, type EventCore, type EventDetail, type EventItem } from '$shared/types';
import type MiniSearch from 'minisearch';

/**
 * Loads static/data/events.json once per session and keeps it in memory, so
 * returning to a list renders at once and the browser can restore scroll.
 * The service worker serves the last copy when offline.
 */

type Status = 'idle' | 'loading' | 'ready' | 'error';

class EventStore {
	status = $state<Status>('idle');
	events = $state.raw<EventCore[]>([]);
	meta = $state.raw<DataMeta | null>(null);
	byId = $derived(new Map(this.events.map((event) => [event.id, event])));
	#pending: Promise<void> | null = null;
	#shards = new Map<number, Promise<Record<string, EventDetail>>>();

	/** Full event: list record plus its detail shard (description, tickets, sources). */
	async details(id: string): Promise<EventItem | undefined> {
		await this.load();
		const core = this.byId.get(id);
		if (!core) return undefined;
		const shard = shardOf(id);
		if (!this.#shards.has(shard)) {
			const request = fetch(`${base}/data/details/${shard}.json`).then((response) => {
				if (!response.ok) throw new Error(`details ${shard} HTTP ${response.status}`);
				return response.json() as Promise<Record<string, EventDetail>>;
			});
			this.#shards.set(shard, request);
			request.catch(() => this.#shards.delete(shard));
		}
		try {
			const detail = (await this.#shards.get(shard)!)[id];
			return { ...core, ...(detail ?? { tickets: [], sources: [], url: '' }) } as EventItem;
		} catch (error) {
			console.warn('Event details failed to load', error);
			return { tickets: [], sources: [], url: '', ...core } as EventItem;
		}
	}
	#index: MiniSearch | null = null;
	#indexPromise: Promise<MiniSearch> | null = null;

	load(force = false): Promise<void> {
		if (this.status === 'ready' && !force) return Promise.resolve();
		if (this.#pending) return this.#pending;
		this.status = this.events.length ? this.status : 'loading';
		this.#pending = (async () => {
			try {
				const [eventsResponse, metaResponse] = await Promise.all([
					fetch(`${base}/data/events.json`),
					fetch(`${base}/data/meta.json`).catch(() => null)
				]);
				if (!eventsResponse.ok) throw new Error(`events.json HTTP ${eventsResponse.status}`);
				const events = (await eventsResponse.json()) as EventItem[];
				this.events = events;
				this.#index = null;
				this.#indexPromise = null;
				if (metaResponse?.ok) this.meta = (await metaResponse.json()) as DataMeta;
				this.status = 'ready';
			} catch (error) {
				console.error('Event data failed to load', error);
				this.status = this.events.length ? 'ready' : 'error';
			} finally {
				this.#pending = null;
			}
		})();
		return this.#pending;
	}

	/** Builds the search index on first use (MiniSearch is loaded lazily). */
	searchIndex(): Promise<MiniSearch> {
		if (this.#index) return Promise.resolve(this.#index);
		if (!this.#indexPromise) {
			this.#indexPromise = import('../search').then(({ buildIndex }) => {
				this.#index = buildIndex(this.events) as unknown as MiniSearch;
				return this.#index;
			});
		}
		return this.#indexPromise;
	}
}

export const eventStore = new EventStore();
