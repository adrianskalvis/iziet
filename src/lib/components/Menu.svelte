<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import { ui } from '$lib/stores/ui.svelte';
	import Mascot from './Mascot.svelte';
	import { fly, fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

	let { returnFocus }: { returnFocus?: HTMLElement | null } = $props();

	const links = [
		{ href: '/', label: 'nav.home' },
		{ href: '/saraksts?skats=visi', label: 'nav.all' },
		{ href: '/kategorijas', label: 'nav.categories' },
		{ href: '/saglabatie', label: 'nav.saved' },
		{ href: '/iestatijumi', label: 'nav.profile' },
		{ href: '/par', label: 'nav.about' }
	];

	let panel = $state<HTMLElement | null>(null);
	const duration = $derived(prefersReducedMotion.current ? 0 : 260);

	$effect(() => {
		if (!ui.menuOpen) return;
		const first = panel?.querySelector<HTMLElement>('a, button');
		first?.focus();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') close();
			if (event.key === 'Tab' && panel) trapFocus(event, panel);
		};
		document.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	});

	function trapFocus(event: KeyboardEvent, container: HTMLElement) {
		const focusable = [...container.querySelectorAll<HTMLElement>('a, button')];
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function close() {
		ui.menuOpen = false;
		returnFocus?.focus();
	}

	async function install() {
		const prompt = ui.installPrompt;
		if (!prompt) return;
		await prompt.prompt();
		ui.installPrompt = null;
		close();
	}

	function isCurrent(href: string): boolean {
		const path = href.split('?')[0];
		return page.url.pathname === `${base}${path}` || (path === '/' && page.url.pathname === `${base}/`);
	}
</script>

{#if ui.menuOpen}
	<div
		id="site-menu"
		class="menu"
		role="dialog"
		aria-modal="true"
		aria-label={t('nav.menu')}
		bind:this={panel}
		transition:fade={{ duration }}
	>
		<nav class="links" in:fly={{ y: -16, duration }}>
			<ul>
				{#each links as link (link.href)}
					<li>
						<a href={`${base}${link.href}`} aria-current={isCurrent(link.href) ? 'page' : undefined} onclick={() => { ui.menuOpen = false; ui.navFromMenu = true; }}>
							{t(link.label)}
						</a>
					</li>
				{/each}
			</ul>
			{#if ui.installPrompt}
				<button class="btn btn-secondary btn-block" type="button" onclick={install}>{t('nav.install')}</button>
			{/if}
		</nav>
		<div class="mascot">
			<Mascot size={84} decorative />
		</div>
	</div>
{/if}

<style>
	.menu {
		position: fixed;
		inset: var(--topbar-height) 0 0 0;
		z-index: 25;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 16px var(--gutter) calc(24px + env(safe-area-inset-bottom));
		background: var(--color-bg);
		overflow-y: auto;
	}

	.links {
		width: 100%;
		max-width: var(--max-width);
		margin: 0 auto;
	}

	ul {
		list-style: none;
		margin: 0 0 24px;
		padding: 0;
	}

	li + li {
		border-top: 2px dashed var(--color-border-subtle);
	}

	a {
		display: flex;
		align-items: center;
		min-height: 64px;
		padding: 8px 4px;
		font-size: 1.625rem;
		font-weight: 800;
		text-decoration: none;
		border-radius: 12px;
	}

	a[aria-current='page'] {
		color: var(--color-primary);
	}

	.mascot {
		align-self: flex-end;
		margin-right: 8px;
	}
</style>
