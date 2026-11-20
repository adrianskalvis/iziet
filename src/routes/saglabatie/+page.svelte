<script lang="ts">
	import BackLink from '$lib/components/BackLink.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import { formatWhen } from '$lib/format';
	import { t } from '$lib/i18n';
	import { resolveOrigin } from '$lib/profile';
	import { distanceKm, isActive } from '$lib/rank';
	import { eventStore } from '$lib/stores/events.svelte';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { savedStore } from '$lib/stores/saved.svelte';
	import type { EventCore } from '$shared/types';
	import { onMount } from 'svelte';

	let now = $state(new Date());
	const origin = $derived(resolveOrigin(profileStore.value));
	const resolved = $derived(savedStore.ids.map((id) => ({ id, event: eventStore.byId.get(id) })));
	const upcoming = $derived(
		resolved
			.map((entry) => entry.event)
			.filter((event): event is EventCore => !!event && isActive(event, now))
			.filter((event, index, list) => list.findIndex((other) => other.id === event.id) === index)
			.sort((a, b) => a.start.localeCompare(b.start))
	);
	/** Saved events that are over or no longer in the data: shown from their snapshot. */
	const past = $derived(
		resolved
			.filter((entry) => !entry.event || !isActive(entry.event, now))
			.map((entry) => ({ id: entry.id, info: entry.event ?? savedStore.snapshots[entry.id] }))
			.filter((entry) => !!entry.info)
	);

	onMount(() => {
		eventStore.load();
	});
</script>

<svelte:head>
	<title>{t('saved.title')} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />
	<h1>{t('saved.title')}</h1>
	{#if eventStore.status === 'error' && savedStore.ids.length}
		<p>{t('error.load')}</p>
		<button class="btn btn-secondary" type="button" onclick={() => eventStore.load(true)}>{t('error.retry')}</button>
	{:else if eventStore.status !== 'ready' && savedStore.ids.length}
		<SkeletonCard />
	{:else if upcoming.length === 0 && past.length === 0}
		<div class="empty">
			<Mascot size={96} decorative />
			<div>
				<p class="strong">{t('saved.empty')}</p>
				<p class="muted">{t('saved.emptyHint')}</p>
			</div>
		</div>
	{:else}
		<div class="cards">
			{#each upcoming as event (event.id)}
				<EventCard level={2} {event} {now} km={distanceKm(origin, event)} />
			{/each}
		</div>
		{#if past.length}
			<h2>{t('saved.past')}</h2>
			<ul class="past">
				{#each past as entry (entry.id)}
					<li>
						<span class="strong">{entry.info!.title}</span>
						<span class="muted">{formatWhen({ start: entry.info!.start }, now)} · {entry.info!.town}</span>
						<button class="btn btn-ghost" type="button" onclick={() => savedStore.toggle(entry.id)}>{t('card.unsave')}</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.cards {
		display: grid;
		gap: 12px;
	}

	.past {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}

	.past li {
		display: grid;
		gap: 2px;
		padding: 12px 16px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}

	.past .btn {
		justify-self: start;
		padding-left: 0;
	}

	.empty {
		display: flex;
		gap: 14px;
		align-items: center;
		padding: 16px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}

	.strong {
		font-weight: 850;
	}
</style>
