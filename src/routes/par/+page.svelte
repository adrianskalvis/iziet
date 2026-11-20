<script lang="ts">
	import BackLink from '$lib/components/BackLink.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import { formatAgo } from '$lib/format';
	import { t } from '$lib/i18n';
	import { eventStore } from '$lib/stores/events.svelte';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { onMount } from 'svelte';

	let now = $state(new Date());
	const sources = $derived(
		[...(eventStore.meta?.sources ?? [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'lv'))
	);

	onMount(() => {
		eventStore.load();
	});
</script>

<svelte:head>
	<title>{t('about.title')} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />
	<div class="hero">
		<Mascot size={110} />
		<h1>{t('about.title')}</h1>
	</div>
	<p>{t('about.intro')}</p>

	<section class="stack">
		<h2>{t('about.howTitle')}</h2>
		<p>{t('about.how')}</p>
	</section>

	<section class="stack">
		<h2>{t('about.privacyTitle')}</h2>
		<p>{t('about.privacy')}</p>
	</section>

	<section class="stack">
		<h2>{t('about.sourcesTitle')}</h2>
		{#if eventStore.meta}
			<p class="muted">{t('about.updated', { time: formatAgo(eventStore.meta.generatedAt, now) })}</p>
			<ul class="sources">
				{#each sources as source (source.id)}
					<li>
						<a href={source.homepage} target="_blank" rel="noopener noreferrer">{source.name}<ExternalLink size={14} aria-hidden="true" /></a>
						<span class="state state-{source.state}">{t(`about.state.${source.state}`)}</span>
						{#if source.count}<span class="muted">{t('about.count', { n: source.count })}</span>{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="stack">
		<h2>{t('about.rightsTitle')}</h2>
		<p>{t('about.rights')}</p>
		<h2>{t('about.attributionTitle')}</h2>
		<p class="muted">{t('about.attribution')}</p>
	</section>
</div>

<style>
	.hero {
		display: flex;
		align-items: flex-end;
		gap: 12px;
	}

	.sources {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
	}

	.sources li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
		padding: 8px 12px;
		border-radius: 12px;
		background: var(--color-surface);
	}

	.sources a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 40px;
		font-weight: 800;
	}

	.state {
		padding: 2px 10px;
		border-radius: var(--radius-chip);
		font-size: var(--text-small);
		font-weight: 750;
	}

	.state-ok {
		background: var(--color-success-tint);
		color: var(--color-success);
	}

	.state-cached,
	.state-disabled {
		background: var(--color-warning-tint);
		color: var(--color-warning);
	}

	.state-failed {
		background: var(--color-border-subtle);
	}
</style>
