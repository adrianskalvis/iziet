<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/nunito/wght.css';
	import { afterNavigate } from '$app/navigation';
	import { dev } from '$app/environment';
	import { base } from '$app/paths';
	import Menu from '$lib/components/Menu.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import { t } from '$lib/i18n';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { onMount, type Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let menuButton = $state<HTMLButtonElement | null>(null);

	afterNavigate(() => {
		ui.menuOpen = false;
		ui.navCount += 1;
	});

	onMount(() => {
		profileStore.touchSession();
		const goOnline = () => {
			ui.online = true;
			ui.showToast(t('offline.online'));
		};
		const goOffline = () => (ui.online = false);
		const onInstallPrompt = (event: Event) => {
			event.preventDefault();
			ui.installPrompt = event as Event & { prompt: () => Promise<void> };
		};
		window.addEventListener('online', goOnline);
		window.addEventListener('offline', goOffline);
		window.addEventListener('beforeinstallprompt', onInstallPrompt);
		if (!dev && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register(`${base}/service-worker.js`).catch((error) => {
				console.warn('Service worker registration failed', error);
			});
		}
		return () => {
			window.removeEventListener('online', goOnline);
			window.removeEventListener('offline', goOffline);
			window.removeEventListener('beforeinstallprompt', onInstallPrompt);
		};
	});
</script>

<svelte:head>
	<title>{t('app.name')}: {t('app.tagline')}</title>
</svelte:head>

<a class="skip-link" href="#main">{t('nav.skip')}</a>
<TopBar bind:menuButton />
<Menu returnFocus={menuButton} />
<StatusBar />
<main id="main" inert={ui.menuOpen}>
	{@render children()}
</main>

<style>
	.skip-link {
		position: absolute;
		left: 8px;
		top: -100px;
		z-index: 50;
		padding: 12px 16px;
		border-radius: 12px;
		background: var(--color-text);
		color: var(--color-surface);
		font-weight: 800;
	}

	.skip-link:focus {
		top: 8px;
	}
</style>
