<script lang="ts">
	import { t } from '$lib/i18n';
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import Mascot from './Mascot.svelte';

	/** One progressive question, shown at most once per session as a dismissible card. */
	let {
		title,
		lead,
		children,
		onlater
	}: { title: string; lead?: string; children: Snippet; onlater: () => void } = $props();
</script>

<section class="ask" aria-label={title}>
	<div class="head">
		<div class="bird"><Mascot size={46} decorative /></div>
		<div class="text">
			<h2 class="title">{title}</h2>
			{#if lead}<p class="muted">{lead}</p>{/if}
		</div>
		<button class="close" type="button" aria-label={t('ask.close')} onclick={onlater}>
			<X size={22} aria-hidden="true" />
		</button>
	</div>
	<div class="options">
		{@render children()}
	</div>
	<button class="btn btn-ghost" type="button" onclick={onlater}>{t('ask.later')}</button>
</section>

<style>
	.ask {
		position: relative;
		display: grid;
		gap: 12px;
		padding: 16px;
		border: 2px dashed var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface-raised);
	}

	.head {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 10px;
		align-items: start;
	}

	.title {
		font-size: 1.25rem;
	}

	.close {
		display: grid;
		place-items: center;
		width: var(--tap-min);
		height: var(--tap-min);
		margin: -8px -8px 0 0;
		border: 0;
		border-radius: 12px;
		background: transparent;
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.btn-ghost {
		justify-self: start;
	}
</style>
