<script lang="ts">
	import { base } from '$app/paths';
	import { t } from '$lib/i18n';
	import { ui } from '$lib/stores/ui.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	/** History back (the browser restores scroll) when the user came from inside the app; else home. */
	function onclick(event: MouseEvent) {
		if (ui.navCount > 1) {
			event.preventDefault();
			window.history.back();
		}
	}
</script>

<a class="back" href={`${base}/`} {onclick}>
	<ArrowLeft size={22} aria-hidden="true" />
	{t('nav.back')}
</a>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--tap-min);
		padding: 0 12px 0 4px;
		margin-left: -4px;
		font-weight: 800;
		text-decoration: none;
		border-radius: 12px;
		justify-self: start;
		align-self: start;
	}
</style>
