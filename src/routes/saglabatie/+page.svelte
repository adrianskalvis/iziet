<script lang="ts">
	import BackLink from '$lib/components/BackLink.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import { t } from '$lib/i18n';
	import { resolveOrigin } from '$lib/profile';
	import { distanceKm, isActive } from '$lib/rank';
	import { eventStore } from '$lib/stores/events.svelte';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { savedStore } from '$lib/stores/saved.svelte';
	import { onMount } from 'svelte';

	let now = $state(new Date());
	const origin = $derived(resolveOrigin(profileStore.value));
	const events = $derived(savedStore.ids.map((id) => eventStore.byId.get(id)).filter((e) => e !== undefined));
	const upcoming = $derived(events.filter((event) => isActive(event, now)).sort((a, b) => a.start.localeCompare(b.start)));
	const past = $derived(events.filter((event) => !isActive(event, now)));

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
	{#if eventStore.status !== 'ready' && savedStore.ids.length}
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
				<EventCard {event} {now} km={distanceKm(origin, event)} />
			{/each}
		</div>
		{#if past.length}
			<h2>{t('saved.past')}</h2>
			<div class="cards past">
				{#each past as event (event.id)}
					<EventCard {event} {now} />
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.cards {
		display: grid;
		gap: 12px;
	}

	.past {
		opacity: 0.7;
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
