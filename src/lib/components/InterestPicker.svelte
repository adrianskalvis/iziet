<script lang="ts">
	import { t } from '$lib/i18n';
	import { CATEGORY_TINT, TAGS } from '$shared/categories';
	import { CATEGORY_IDS, type CategoryId } from '$shared/types';

	/** Category chips plus an open list of niche and genre tags behind "Vēl intereses". */
	let {
		cats = [],
		tags = [],
		onchange
	}: { cats?: CategoryId[]; tags?: string[]; onchange: (next: { cats: CategoryId[]; tags: string[] }) => void } = $props();

	let showTags = $state(tags.length > 0);
	const ORDER: CategoryId[] = [...CATEGORY_IDS];

	function toggleCat(id: CategoryId) {
		const next = cats.includes(id) ? cats.filter((c) => c !== id) : [...cats, id];
		onchange({ cats: next, tags });
	}

	function toggleTag(id: string) {
		const next = tags.includes(id) ? tags.filter((tag) => tag !== id) : [...tags, id];
		onchange({ cats, tags: next });
	}

	const sortedTags = $derived([...TAGS].sort((a, b) => t(`tag.${a.id}`).localeCompare(t(`tag.${b.id}`), 'lv')));
</script>

<div class="cats" role="group" aria-label={t('profile.interests')}>
	{#each ORDER as id (id)}
		<button
			type="button"
			class="chip cat"
			aria-pressed={cats.includes(id)}
			style:--ink={`var(--cat-${CATEGORY_TINT[id]}-icon)`}
			onclick={() => toggleCat(id)}
		>
			<span class="dot" aria-hidden="true"></span>
			{t(`cat.${id}`)}
		</button>
	{/each}
</div>

<button type="button" class="btn btn-ghost more" aria-expanded={showTags} onclick={() => (showTags = !showTags)}>
	{showTags ? t('onboarding.fewerInterests') : t('onboarding.moreInterests')}
</button>

{#if showTags}
	<div class="chip-grid" role="group" aria-label={t('profile.tags')}>
		{#each sortedTags as tag (tag.id)}
			<button type="button" class="chip tag" aria-pressed={tags.includes(tag.id)} onclick={() => toggleTag(tag.id)}>
				{t(`tag.${tag.id}`)}
			</button>
		{/each}
	</div>
{/if}

<style>
	.cats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.cat {
		width: 100%;
		min-height: 56px;
		border-radius: var(--radius-button);
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--ink);
		flex: none;
	}

	.cat[aria-pressed='true'] .dot {
		background: var(--color-surface);
	}

	.more {
		justify-self: start;
		margin-top: 4px;
	}

	.tag {
		font-weight: 650;
	}
</style>
