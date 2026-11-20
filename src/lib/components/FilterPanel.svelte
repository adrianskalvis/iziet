<script lang="ts" module>
	export type FilterKey = 'kad' | 'kat' | 'bez' | 'gim' | 'kart';

	/** URL value of each period filter. */
	export const WHEN_PARAM = { sodien: 'today', rit: 'tomorrow', 'nedelas-nogale': 'weekend', sonedel: 'week' } as const;
</script>

<script lang="ts">
	import { plural, t } from '$lib/i18n';
	import type { When } from '$lib/rank';
	import { CATEGORY_IDS, type CategoryId } from '$shared/types';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';

	/**
	 * One "Filtri" button instead of three sideways-scrolling rows. Every option is
	 * a wrapping chip that switches on with one tap and off with the next; several
	 * can be on at once. The chosen filters stay visible as chips that remove
	 * themselves on tap.
	 */
	let {
		whens,
		cats,
		free,
		family,
		soon,
		near,
		showCategories = true,
		count,
		ontoggle,
		onreset,
		onclear
	}: {
		whens: When[];
		cats: CategoryId[];
		free: boolean;
		family: boolean;
		soon: boolean;
		near: boolean;
		showCategories?: boolean;
		count: number;
		/** Switches one value of a filter group on, or off when it is already on. */
		ontoggle: (key: FilterKey, value: string) => void;
		/** Switches off every value of one group. */
		onreset: (key: FilterKey) => void;
		onclear: () => void;
	} = $props();

	let open = $state(false);

	const WHEN_LABEL: Record<Exclude<When, 'any'>, string> = {
		today: 'list.today',
		tomorrow: 'list.tomorrow',
		weekend: 'list.weekend',
		week: 'list.week'
	};
	const WHEN_OPTIONS = Object.entries(WHEN_PARAM) as Array<[string, Exclude<When, 'any'>]>;

	const active = $derived([
		...WHEN_OPTIONS.filter(([, option]) => whens.includes(option)).map(([value, option]) => ({
			key: 'kad' as const,
			value,
			label: t(WHEN_LABEL[option])
		})),
		...cats.map((id) => ({ key: 'kat' as const, value: id as string, label: t(`cat.${id}`) })),
		...(free ? [{ key: 'bez' as const, value: '1', label: t('list.free') }] : []),
		...(family ? [{ key: 'gim' as const, value: '1', label: t('list.family') }] : []),
		...(soon ? [{ key: 'kart' as const, value: 'drizak', label: t('list.sortSoon') }] : []),
		...(near ? [{ key: 'kart' as const, value: 'tuvak', label: t('list.sortNear') }] : [])
	]);
</script>

<div class="filters">
	<div class="bar">
		<button class="btn btn-secondary toggle" type="button" aria-expanded={open} aria-controls="filter-panel" onclick={() => (open = !open)}>
			<SlidersHorizontal size={20} aria-hidden="true" />
			{t('list.filters')}{active.length ? ` (${active.length})` : ''}
		</button>
		{#if active.length}
			<ul class="active" aria-label={t('list.active')}>
				{#each active as item (item.key + item.value)}
					<li>
						<button
							class="chip is-active"
							type="button"
							aria-label={t('list.remove', { name: item.label })}
							onclick={() => ontoggle(item.key, item.value)}
						>
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
					<button type="button" class="chip" aria-pressed={whens.length === 0} onclick={() => onreset('kad')}>{t('list.anytime')}</button>
					{#each WHEN_OPTIONS as [value, option] (option)}
						<button type="button" class="chip" aria-pressed={whens.includes(option)} onclick={() => ontoggle('kad', value)}>
							{t(WHEN_LABEL[option])}
						</button>
					{/each}
				</div>
			</fieldset>

			{#if showCategories}
				<fieldset>
					<legend>{t('list.category')}</legend>
					<div class="chip-grid">
						<button type="button" class="chip" aria-pressed={cats.length === 0} onclick={() => onreset('kat')}>{t('list.allCategories')}</button>
						{#each CATEGORY_IDS as id (id)}
							<button type="button" class="chip" aria-pressed={cats.includes(id)} onclick={() => ontoggle('kat', id)}>
								{t(`cat.${id}`)}
							</button>
						{/each}
					</div>
				</fieldset>
			{/if}

			<fieldset>
				<legend>{t('list.more')}</legend>
				<div class="chip-grid">
					<button type="button" class="chip" aria-pressed={free} onclick={() => ontoggle('bez', '1')}>{t('list.free')}</button>
					<button type="button" class="chip" aria-pressed={family} onclick={() => ontoggle('gim', '1')}>{t('list.family')}</button>
					<button type="button" class="chip" aria-pressed={soon} onclick={() => ontoggle('kart', 'drizak')}>{t('list.sortSoon')}</button>
					<button type="button" class="chip" aria-pressed={near} onclick={() => ontoggle('kart', 'tuvak')}>{t('list.sortNear')}</button>
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
