<script lang="ts">
	import { base } from '$app/paths';
	import BackLink from '$lib/components/BackLink.svelte';
	import CategoryArt from '$lib/components/CategoryArt.svelte';
	import { plural, t } from '$lib/i18n';
	import { isActive } from '$lib/rank';
	import { eventStore } from '$lib/stores/events.svelte';
	import { TAGS } from '$shared/categories';
	import { CATEGORY_IDS, type CategoryId } from '$shared/types';
	import { onMount } from 'svelte';

	let now = $state(new Date());
	const counts = $derived.by(() => {
		const byCat = new Map<CategoryId, number>();
		const byTag = new Map<string, number>();
		for (const event of eventStore.events) {
			if (!isActive(event, now)) continue;
			byCat.set(event.cat, (byCat.get(event.cat) ?? 0) + 1);
			for (const tag of event.tags) byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
		}
		return { byCat, byTag };
	});
	const tags = $derived(
		[...TAGS]
			.filter((tag) => (counts.byTag.get(tag.id) ?? 0) > 0)
			.sort((a, b) => t(`tag.${a.id}`).localeCompare(t(`tag.${b.id}`), 'lv'))
	);

	onMount(() => {
		eventStore.load();
	});
</script>

<svelte:head>
	<title>{t('categories.title')} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />
	<h1>{t('categories.title')}</h1>
	<p class="muted">{t('categories.lead')}</p>

	<ul class="grid">
		{#each CATEGORY_IDS as cat (cat)}
			<li>
				<a class="tile" href={`${base}/saraksts?skats=visi&kat=${cat}`}>
					<span class="art"><CategoryArt {cat} compact /></span>
					<span class="label">{t(`cat.${cat}`)}</span>
					{#if eventStore.status === 'ready'}
						<span class="count">{plural('events', counts.byCat.get(cat) ?? 0)}</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>

	{#if tags.length}
		<h2>{t('categories.niches')}</h2>
		<div class="chip-grid">
			{#each tags as tag (tag.id)}
				<a class="chip" href={`${base}/saraksts?skats=visi&tag=${tag.id}`}>{t(`tag.${tag.id}`)} <span class="muted">{counts.byTag.get(tag.id)}</span></a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.tile {
		display: grid;
		gap: 6px;
		padding: 8px 8px 12px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
		box-shadow: var(--shadow-card);
		text-decoration: none;
		height: 100%;
	}

	.art {
		position: relative;
		display: block;
		aspect-ratio: 16 / 10;
		border-radius: 14px;
		overflow: hidden;
	}

	.label {
		font-weight: 850;
		line-height: 1.2;
		padding: 0 4px;
	}

	.count {
		font-size: var(--text-small);
		color: var(--color-text-muted);
		padding: 0 4px;
	}

	.chip {
		text-decoration: none;
	}
</style>
