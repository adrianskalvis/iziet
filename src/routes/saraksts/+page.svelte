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
	import FilterPanel, { WHEN_PARAM, type FilterKey } from '$lib/components/FilterPanel.svelte';
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import { has, plural, t } from '$lib/i18n';
	import { getPlace } from '$lib/profile';
	import { listEvents, reasonLabels, type ListOptions } from '$lib/rank';
	import { eventStore } from '$lib/stores/events.svelte';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { CATEGORY_IDS, type CategoryId } from '$shared/types';
	import { onMount } from 'svelte';

	const PAGE_SIZE = 20;

	let now = $state(new Date());
	const params = $derived(browser ? page.url.searchParams : new URLSearchParams());
	const view = $derived(params.get('skats') ?? 'visi');
	const scope = $derived<ListOptions['scope']>(view === 'tuvuma' ? 'nearby' : view === 'latvija' ? 'elsewhere' : 'all');
	/** Several values of one filter share a parameter, joined by commas: kat=koncerti,teatris. */
	const chosen = (source: URLSearchParams, key: string) => (source.get(key) ?? '').split(',').filter(Boolean);
	const cats = $derived(chosen(params, 'kat').filter((id): id is CategoryId => (CATEGORY_IDS as readonly string[]).includes(id)));
	const cat = $derived(cats.length === 1 ? cats[0] : undefined);
	const tag = $derived(params.get('tag') ?? undefined);
	const whens = $derived(
		chosen(params, 'kad')
			.filter((value): value is keyof typeof WHEN_PARAM => value in WHEN_PARAM)
			.map((value) => WHEN_PARAM[value])
	);
	const free = $derived(params.get('bez') === '1');
	const family = $derived(params.get('gim') === '1');
	const placeId = $derived(params.get('vieta') ?? undefined);
	const soon = $derived(chosen(params, 'kart').includes('drizak'));
	const near = $derived(chosen(params, 'kart').includes('tuvak'));
	const sort = $derived<ListOptions['sort']>(soon && near ? 'soon-near' : soon ? 'soon' : near ? 'near' : 'best');

	const items = $derived(
		eventStore.status === 'ready'
			? listEvents(eventStore.events, profileStore.value, now, { scope, cats, tag, whens, free, family, placeId, sort })
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


	function setParam(key: FilterKey, values: string[]) {
		const next = new URLSearchParams(page.url.searchParams);
		if (values.length === 0) next.delete(key);
		else next.set(key, values.join(','));
		visible = PAGE_SIZE;
		goto(`${base}/saraksts?${next}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	/** One tap switches a filter value on, the next tap switches it off; other values stay. */
	function toggleParam(key: FilterKey, value: string) {
		const current = chosen(page.url.searchParams, key);
		setParam(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
	}

</script>

<svelte:head>
	<title>{title} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />
	<h1>{title}</h1>

	<FilterPanel
		{whens}
		{cats}
		{free}
		{family}
		{soon}
		{near}
		showCategories={!tag}
		count={items.length}
		ontoggle={toggleParam}
		onreset={(key) => setParam(key, [])}
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
			{#if whens.length || free || family || cats.length}
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
