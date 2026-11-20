<script lang="ts">
	import { t } from '$lib/i18n';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { savedStore } from '$lib/stores/saved.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { consumeRedirect, mergePayloads, pull, push, readSession, signOut, startSignIn, syncConfig, type Session } from '$lib/sync';
	import { onMount } from 'svelte';

	/** Renders nothing unless sync is configured at build time (feature flag). */
	const config = syncConfig();
	let session = $state<Session | null>(null);
	let busy = $state(false);

	onMount(() => {
		if (!config) return;
		session = readSession();
		consumeRedirect(config)
			.then((result) => {
				session = result;
				if (result) syncNow();
			})
			.catch((error) => {
				console.warn(error);
				ui.showToast(t('sync.failed'));
			});
	});

	async function syncNow() {
		if (!config || !session) return;
		busy = true;
		try {
			const local = { profile: profileStore.value, saved: savedStore.ids };
			const merged = mergePayloads(local, await pull(config, session));
			profileStore.update(merged.profile, { prefs: false });
			for (const id of merged.saved) if (!savedStore.has(id)) savedStore.toggle(id);
			await push(config, session, { profile: profileStore.value, saved: savedStore.ids });
			ui.showToast(t('sync.synced'));
		} catch (error) {
			console.warn(error);
			ui.showToast(t('sync.failed'));
		} finally {
			busy = false;
		}
	}
</script>

{#if config}
	<section class="sync stack">
		<h2>{t('sync.title')}</h2>
		<p class="muted">{t('sync.lead')}</p>
		{#if session}
			<button class="btn btn-secondary" type="button" disabled={busy} onclick={syncNow}>{t('sync.synced')}</button>
			<button
				class="btn btn-ghost"
				type="button"
				onclick={() => {
					signOut();
					session = null;
				}}>{t('sync.signOut')}</button
			>
		{:else}
			<button class="btn btn-secondary" type="button" onclick={() => startSignIn(config, 'google')}>{t('sync.google')}</button>
			<button class="btn btn-secondary" type="button" onclick={() => startSignIn(config, 'apple')}>{t('sync.apple')}</button>
		{/if}
	</section>
{/if}

<style>
	.sync {
		padding: 16px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
		gap: 12px;
	}
</style>
