<script lang="ts">
	import { t } from '$lib/i18n';
	import { ui } from '$lib/stores/ui.svelte';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
</script>

{#if !ui.online}
	<div class="banner" role="status">
		<WifiOff size={20} aria-hidden="true" />
		<span>{t('offline.banner')}</span>
	</div>
{/if}

<div class="toast-region" aria-live="polite">
	{#if ui.toast}
		<div class="toast">{ui.toast}</div>
	{/if}
</div>

<style>
	.banner {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		max-width: var(--max-width);
		margin: 0 auto 8px;
		padding: 10px var(--gutter);
		background: var(--color-warning-tint);
		color: var(--color-text);
		font-size: var(--text-small);
		font-weight: 700;
	}

	.banner :global(svg) {
		flex: none;
		margin-top: 3px;
	}

	.toast-region {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(20px + env(safe-area-inset-bottom));
		z-index: 40;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.toast {
		padding: 12px 20px;
		border-radius: var(--radius-chip);
		background: var(--color-text);
		color: var(--color-surface);
		font-weight: 750;
		box-shadow: var(--shadow-pop);
	}
</style>
