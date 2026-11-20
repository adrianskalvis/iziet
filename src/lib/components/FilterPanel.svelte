<script lang="ts">
	import { plural, t } from '$lib/i18n';
	import type { ListOptions, When } from '$lib/rank';
	import { CATEGORY_IDS, type CategoryId } from '$shared/types';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';

	/**
	 * One "Filtri" button instead of three sideways-scrolling rows. The panel shows
	 * every option as wrapping chips (no horizontal scroll), and the chosen filters
	 * stay visible as chips that remove themselves on tap.
	 */
	let {
		when,
		free,
		family,
		sort,
		cat,
		showCategories = true,
		count,
		onset,
		onclear
	}: {
		when: When;
		free: boolean;
		family: boolean;
		sort: ListOptions['sort'];
		cat?: CategoryId;
		showCategories?: boolean;
		count: number;
		onset: (key: string, value: string | null) => void;
		onclear: () => void;
	} = $props();

	let open = $state(false);

	const WHEN_OPTIONS: Array<[string | null, When, string]> = [
		[null, 'any', 'list.anytime'],
		['sodien', 'today', 'list.today'],
		['rit', 'tomorrow', 'list.tomorrow'],
		['nedelas-nogale', 'weekend', 'list.weekend'],
		['sonedel', 'week', 'list.week']
	];

	const active = $derived(
		[
			when !== 'any' && { key: 'kad', label: t(WHEN_OPTIONS.find((o) => o[1] === when)![2]) },
			cat && { key: 'kat', label: t(`cat.${cat}`) },
			free && { key: 'bez', label: t('list.free') },
			family && { key: 'gim', label: t('list.family') },
			sort === 'soon' && { key: 'kart', label: t('list.sortSoon') },
			sort === 'near' && { key: 'kart', label: t('list.sortNear') }
		].filter((item): item is { key: string; label: string } => !!item)
	);
</script>

<div class="filters">
	<div class="bar">
		<button class="btn btn-secondary toggle" type="button" aria-expanded={open} aria-controls="filter-panel" onclick={() => (open = !open)}>
			<SlidersHorizontal size={20} aria-hidden="true" />
			{t('list.filters')}{active.length ? ` (${active.length})` : ''}
		</button>
		{#if active.length}
			<ul class="active" aria-label={t('list.active')}>
				{#each active as item (item.key + item.label)}
					<li>
						<button class="chip is-active" type="button" aria-label={t('list.remove', { name: item.label })} onclick={() => onset(item.key, null)}>
							{item.label}
							<X size={16} aria-hidden="true" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if open}
		<div class="panel" id="filter-panel">
			<fieldset>
				<legend>{t('list.when')}</legend>
				<div class="chip-grid">
					{#each WHEN_OPTIONS as [value, option, label] (option)}
						<button type="button" class="chip" aria-pressed={when === option} onclick={() => onset('kad', value)}>{t(label)}</button>
					{/each}
				</div>
			</fieldset>

			{#if showCategories}
				<fieldset>
					<legend>{t('list.category')}</legend>
					<div class="chip-grid">
						<button type="button" class="chip" aria-pressed={!cat} onclick={() => onset('kat', null)}>{t('list.allCategories')}</button>
						{#each CATEGORY_IDS as id (id)}
							<button type="button" class="chip" aria-pressed={cat === id} onclick={() => onset('kat', cat === id ? null : id)}>
								{t(`cat.${id}`)}
							</button>
						{/each}
					</div>
				</fieldset>
			{/if}

			<fieldset>
				<legend>{t('list.more')}</legend>
				<div class="chip-grid">
					<button type="button" class="chip" aria-pressed={free} onclick={() => onset('bez', free ? null : '1')}>{t('list.free')}</button>
					<button type="button" class="chip" aria-pressed={family} onclick={() => onset('gim', family ? null : '1')}>{t('list.family')}</button>
					<button type="button" class="chip" aria-pressed={sort === 'soon'} onclick={() => onset('kart', sort === 'soon' ? null : 'drizak')}>
						{t('list.sortSoon')}
					</button>
					<button type="button" class="chip" aria-pressed={sort === 'near'} onclick={() => onset('kart', sort === 'near' ? null : 'tuvak')}>
						{t('list.sortNear')}
					</button>
				</div>
			</fieldset>

			<div class="actions">
				<button class="btn btn-primary" type="button" onclick={() => (open = false)}>
					{t('list.show', { count: plural('events', count) })}
				</button>
				{#if active.length}
					<button class="btn btn-ghost" type="button" onclick={onclear}>{t('list.clear')}</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.filters {
		display: grid;
		gap: 12px;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.toggle {
		min-height: var(--tap-min);
	}

	.active {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.panel {
		display: grid;
		gap: 16px;
		padding: 16px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
		box-shadow: var(--shadow-card);
	}

	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		display: grid;
		gap: 8px;
	}

	legend {
		padding: 0 0 8px;
		font-weight: 850;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
</style>
