<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import BackLink from '$lib/components/BackLink.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import SearchBar, { type Scope } from '$lib/components/SearchBar.svelte';
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import { plural, t } from '$lib/i18n';
	import { resolveOrigin } from '$lib/profile';
	import { distanceKm, NEARBY_RADIUS, passesHardFilters, scoreEvent, type Scored } from '$lib/rank';
	import { searchIds } from '$lib/search';
	import { eventStore } from '$lib/stores/events.svelte';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { onMount } from 'svelte';

	const MAX_RESULTS = 60;
	const DEBOUNCE_MS = 80;

	let now = $state(new Date());
	let query = $state(browser ? (page.url.searchParams.get('q') ?? '') : '');
	let scope = $state<Scope>(browser && page.url.searchParams.get('kur') === 'latvija' ? 'all' : 'nearby');
	let ids = $state.raw<string[]>([]);
	let searching = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const results = $derived.by((): Scored[] => {
		const profile = profileStore.value;
		const origin = resolveOrigin(profile);
		const radius = NEARBY_RADIUS[origin.kind] * 2;
		const out: Scored[] = [];
		for (const id of ids) {
			const event = eventStore.byId.get(id);
			if (!event || !passesHardFilters(event, profile, now)) continue;
			if (scope === 'nearby') {
				const km = distanceKm(origin, event);
				if (km === undefined || km > radius) continue;
			}
			out.push(scoreEvent(event, profile, origin, now));
			if (out.length >= MAX_RESULTS) break;
		}
		return out;
	});

	async function run(value: string) {
		if (value.trim().length < 2) {
			ids = [];
			return;
		}
		searching = true;
		await eventStore.load();
		const index = await eventStore.searchIndex();
		ids = searchIds(index as never, value);
		searching = false;
	}

	function onInput(value: string, nextScope: Scope) {
		scope = nextScope;
		clearTimeout(timer);
		timer = setTimeout(() => {
			run(value);
			const url = `${base}/meklet?q=${encodeURIComponent(value)}&kur=${scope === 'all' ? 'latvija' : 'tuvuma'}`;
			goto(url, { replaceState: true, keepFocus: true, noScroll: true });
		}, DEBOUNCE_MS);
	}

	onMount(() => {
		eventStore.load().then(() => run(query));
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{t('search.label')} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />
	<h1 class="visually-hidden">{t('search.label')}</h1>
	<SearchBar bind:value={query} bind:scope autofocus oninput={onInput} onsubmit={onInput} />

	{#if query.trim().length < 2}
		<p class="muted">{t('search.hint')}</p>
	{:else if searching && results.length === 0}
		<SkeletonCard />
		<SkeletonCard />
	{:else}
		<p class="count" role="status">{plural('events', results.length, { noneKey: 'plural.none' })}</p>
		{#if results.length === 0}
			<p>{t('search.noResults')}</p>
			{#if scope === 'nearby'}
				<button class="btn btn-secondary" type="button" onclick={() => onInput(query, 'all')}>{t('search.tryAll')}</button>
			{/if}
		{:else}
			<div class="cards">
				{#each results as item (item.event.id)}
					<EventCard event={item.event} {now} km={item.km} />
				{/each}
			</div>
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
