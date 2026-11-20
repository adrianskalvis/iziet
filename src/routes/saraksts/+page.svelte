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
	import FilterPanel from '$lib/components/FilterPanel.svelte';
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

</script>

<svelte:head>
	<title>{title} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />
	<h1>{title}</h1>

	<FilterPanel
		{when}
		{free}
		{family}
		{sort}
		{cat}
		showCategories={!tag}
		count={items.length}
		onset={setParam}
		onclear={() => goto(`${base}/saraksts?skats=${view}`, { replaceState: true, keepFocus: true, noScroll: true })}
	/>

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

	.count {
		font-weight: 800;
		color: var(--color-text-muted);
	}

	.cards {
		display: grid;
		gap: 12px;
	}
</style>
