<script lang="ts" module>
	/** How many cards each list URL showed, so "back" restores length and scroll. */
	const visibleByUrl = new Map<string, number>();
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import BackLink from '$lib/components/BackLink.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import { has, plural, t } from '$lib/i18n';
	import { getPlace } from '$lib/profile';
	import { listEvents, reasonLabels, type ListOptions, type When } from '$lib/rank';
	import { eventStore } from '$lib/stores/events.svelte';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { CATEGORY_IDS, type CategoryId } from '$shared/types';
	import { onMount } from 'svelte';

	const PAGE_SIZE = 20;
	const WHEN_PARAM: Record<string, When> = { sodien: 'today', rit: 'tomorrow', 'nedelas-nogale': 'weekend', sonedel: 'week' };
	const WHEN_LABEL: Record<When, string> = { today: 'list.today', tomorrow: 'list.tomorrow', weekend: 'list.weekend', week: 'list.week', any: 'list.anytime' };

	let now = $state(new Date());
	const params = $derived(browser ? page.url.searchParams : new URLSearchParams());
	const view = $derived(params.get('skats') ?? 'visi');
	const scope = $derived<ListOptions['scope']>(view === 'tuvuma' ? 'nearby' : view === 'latvija' ? 'elsewhere' : 'all');
	const cat = $derived((CATEGORY_IDS as readonly string[]).includes(params.get('kat') ?? '') ? (params.get('kat') as CategoryId) : undefined);
	const tag = $derived(params.get('tag') ?? undefined);
	const when = $derived<When>(WHEN_PARAM[params.get('kad') ?? ''] ?? 'any');
	const free = $derived(params.get('bez') === '1');
	const family = $derived(params.get('gim') === '1');
	const placeId = $derived(params.get('vieta') ?? undefined);
	const sort = $derived<ListOptions['sort']>(params.get('kart') === 'drizak' ? 'soon' : params.get('kart') === 'tuvak' ? 'near' : 'best');

	const items = $derived(
		eventStore.status === 'ready'
			? listEvents(eventStore.events, profileStore.value, now, { scope, cat, tag, when, free, family, placeId, sort })
			: []
	);
	let visible = $state(visibleByUrl.get(browser ? page.url.search : '') ?? PAGE_SIZE);

	const title = $derived(
		cat
			? t(`cat.${cat}`)
			: tag && has(`tag.${tag}`)
				? t(`tag.${tag}`)
				: placeId
					? (getPlace(placeId)?.name ?? t('list.all'))
					: scope === 'nearby'
						? t('list.nearby')
						: scope === 'elsewhere'
							? t('list.elsewhere')
							: t('list.all')
	);

	onMount(() => {
		eventStore.load();
	});

	$effect(() => {
		if (browser) visibleByUrl.set(page.url.search, visible);
	});

	function setParam(key: string, value: string | null) {
		const next = new URLSearchParams(page.url.searchParams);
		if (value === null) next.delete(key);
		else next.set(key, value);
		visible = PAGE_SIZE;
		goto(`${base}/saraksts?${next}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	const whenOptions: Array<[string | null, When]> = [
		[null, 'any'],
		['sodien', 'today'],
		['rit', 'tomorrow'],
		['nedelas-nogale', 'weekend'],
		['sonedel', 'week']
	];
</script>

<svelte:head>
	<title>{title} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />
	<h1>{title}</h1>

	<div class="filters" aria-label={t('list.filters')}>
		<div class="chip-row" role="group" aria-label={t('list.when')}>
			{#each whenOptions as [value, option] (option)}
				<button type="button" class="chip" aria-pressed={when === option} onclick={() => setParam('kad', value)}>
					{t(WHEN_LABEL[option])}
				</button>
			{/each}
		</div>
		<div class="chip-row" role="group" aria-label={t('list.filters')}>
			<button type="button" class="chip" aria-pressed={free} onclick={() => setParam('bez', free ? null : '1')}>{t('list.free')}</button>
			<button type="button" class="chip" aria-pressed={family} onclick={() => setParam('gim', family ? null : '1')}>{t('list.family')}</button>
			<button type="button" class="chip" aria-pressed={sort === 'soon'} onclick={() => setParam('kart', sort === 'soon' ? null : 'drizak')}>
				{t('list.sortSoon')}
			</button>
			<button type="button" class="chip" aria-pressed={sort === 'near'} onclick={() => setParam('kart', sort === 'near' ? null : 'tuvak')}>
				{t('list.sortNear')}
			</button>
		</div>
		{#if !tag}
			<div class="chip-row" role="group" aria-label={t('list.category')}>
				<button type="button" class="chip" aria-pressed={!cat} onclick={() => setParam('kat', null)}>{t('list.allCategories')}</button>
				{#each CATEGORY_IDS as id (id)}
					<button type="button" class="chip" aria-pressed={cat === id} onclick={() => setParam('kat', cat === id ? null : id)}>
						{t(`cat.${id}`)}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if eventStore.status === 'error'}
		<p>{t('error.load')}</p>
		<button class="btn btn-secondary" type="button" onclick={() => eventStore.load(true)}>{t('error.retry')}</button>
	{:else if eventStore.status !== 'ready'}
		<SkeletonCard />
		<SkeletonCard />
		<SkeletonCard />
	{:else}
		<p class="count" role="status">{plural('events', items.length, { noneKey: 'plural.none' })}</p>
		{#if items.length === 0}
			<p class="muted">{t('list.empty')}</p>
			{#if when !== 'any' || free || family || cat}
				<a class="btn btn-secondary" href={`${base}/saraksts?skats=${view}`}>{t('list.clear')}</a>
			{/if}
		{:else}
			<div class="cards">
				{#each items.slice(0, visible) as item, index (item.event.id)}
					<EventCard level={2} priority={index === 0} event={item.event} {now} km={item.km} labels={reasonLabels(item, profileStore.value, now)} />
				{/each}
			</div>
			{#if items.length > visible}
				<button class="btn btn-secondary btn-block" type="button" onclick={() => (visible += PAGE_SIZE)}>{t('list.loadMore')}</button>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.filters {
		display: grid;
		gap: 2px;
	}

	.chip-row {
		margin: 0 calc(var(--gutter) * -1);
		padding-left: var(--gutter);
		padding-right: var(--gutter);
	}

	.count {
		font-weight: 800;
		color: var(--color-text-muted);
	}

	.cards {
		display: grid;
		gap: 12px;
	}
</style>
