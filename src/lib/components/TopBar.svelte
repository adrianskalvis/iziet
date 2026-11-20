<script lang="ts">
	import { base } from '$app/paths';
	import { t } from '$lib/i18n';
	import { ui } from '$lib/stores/ui.svelte';
	import Flag from './Flag.svelte';

	let { menuButton = $bindable<HTMLButtonElement | null>(null) }: { menuButton?: HTMLButtonElement | null } = $props();
</script>

<header class="topbar">
	<button
		bind:this={menuButton}
		class="burger"
		class:open={ui.menuOpen}
		type="button"
		aria-expanded={ui.menuOpen}
		aria-controls="site-menu"
		aria-label={ui.menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
		onclick={() => (ui.menuOpen = !ui.menuOpen)}
	>
		<span class="line line-1"></span>
		<span class="line line-2"></span>
		<span class="line line-3"></span>
	</button>

	<a class="brand" href={`${base}/`} onclick={() => (ui.menuOpen = false)}>{t('app.name')}</a>

	<div class="flag-slot">
		<Flag size={34} />
	</div>
</header>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		display: grid;
		grid-template-columns: var(--tap-corner) 1fr var(--tap-corner);
		align-items: center;
		height: var(--topbar-height);
		padding: env(safe-area-inset-top) 4px 0;
		background: color-mix(in srgb, var(--color-bg) 92%, transparent);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.burger {
		position: relative;
		width: var(--tap-corner);
		height: var(--tap-corner);
		border: 0;
		background: transparent;
		border-radius: 16px;
		-webkit-tap-highlight-color: transparent;
	}

	.line {
		position: absolute;
		left: 15px;
		height: 3.5px;
		border-radius: 3px;
		background: var(--color-text);
		transition:
			transform var(--motion-medium) var(--ease-out),
			opacity var(--motion-fast),
			width var(--motion-medium) var(--ease-out);
	}

	.line-1 {
		top: 19px;
		width: 26px;
	}

	.line-2 {
		top: 26.5px;
		width: 20px;
	}

	.line-3 {
		top: 34px;
		width: 24px;
	}

	.open .line-1 {
		width: 27px;
		transform: translateY(7.5px) rotate(45deg);
	}

	.open .line-2 {
		opacity: 0;
		transform: translateX(-8px);
	}

	.open .line-3 {
		width: 27px;
		transform: translateY(-7.5px) rotate(-45deg);
	}

	.brand {
		justify-self: center;
		padding: 6px 12px;
		font-size: 1.75rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		text-decoration: none;
		border-radius: 12px;
	}

	.flag-slot {
		display: grid;
		place-items: center;
		width: var(--tap-corner);
		height: var(--tap-corner);
	}
</style>
