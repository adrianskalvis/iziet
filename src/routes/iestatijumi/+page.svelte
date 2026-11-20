<script lang="ts">
	import BackLink from '$lib/components/BackLink.svelte';
	import CompanionPicker from '$lib/components/CompanionPicker.svelte';
	import InterestPicker from '$lib/components/InterestPicker.svelte';
	import PlacePicker from '$lib/components/PlacePicker.svelte';
	import SyncPanel from '$lib/components/SyncPanel.svelte';
	import { t } from '$lib/i18n';
	import { resolveOrigin, RIGA } from '$lib/profile';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { fold } from '$shared/fold';
	import { APKAIMES } from '$shared/places.generated';

	const profile = $derived(profileStore.value);
	const origin = $derived(resolveOrigin(profile));
	let apkaimeQuery = $state('');
	const apkaimes = $derived(
		[...APKAIMES]
			.filter((a) => !apkaimeQuery.trim() || fold(a.name).includes(fold(apkaimeQuery.trim())))
			.sort((a, b) => a.name.localeCompare(b.name, 'lv'))
	);

	function reset() {
		if (!window.confirm(t('profile.resetConfirm'))) return;
		profileStore.reset();
		ui.showToast(t('profile.resetDone'));
	}
</script>

<svelte:head>
	<title>{t('profile.title')} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />
	<h1>{t('profile.title')}</h1>
	<p class="muted">{t('profile.privacy')}</p>

	<section class="card stack">
		<h2>{t('profile.place')}</h2>
		<p class="current">{origin.isDefault ? t('profile.noPlace') : (origin.apkaime ? `${origin.place.name}, ${origin.apkaime.name}` : origin.place.name)}</p>
		<PlacePicker
			placeId={profile.placeId}
			hasGeo={!!profile.geo}
			onchange={(choice) =>
				profileStore.update(
					choice.geo
						? { geo: { ...choice.geo, at: new Date().toISOString() }, apkaime: choice.apkaime, placeId: undefined }
						: { placeId: choice.placeId, geo: undefined, apkaime: undefined }
				)}
		/>
	</section>

	{#if origin.kind === 'riga'}
		<section class="card stack">
			<h2>{t('profile.apkaime')}</h2>
			<label>
				<span class="visually-hidden">{t('ask.apkaime.placeholder')}</span>
				<input class="input" type="search" bind:value={apkaimeQuery} placeholder={t('ask.apkaime.placeholder')} autocomplete="off" />
			</label>
			<div class="chip-grid apkaimes">
				{#each apkaimes as apkaime (apkaime.id)}
					<button
						type="button"
						class="chip"
						aria-pressed={profile.apkaime === apkaime.id}
						onclick={() => profileStore.update({ apkaime: profile.apkaime === apkaime.id ? undefined : apkaime.id, placeId: RIGA.id, geo: undefined })}
					>
						{apkaime.name}
					</button>
				{/each}
			</div>
		</section>
	{/if}

	<section class="card stack">
		<h2>{t('profile.companions')}</h2>
		<CompanionPicker companions={profile.companions} kids={profile.kids} onchange={(next) => profileStore.update(next)} />
	</section>

	<section class="card stack">
		<h2>{t('profile.interests')}</h2>
		<InterestPicker cats={profile.cats} tags={profile.tags} onchange={(next) => profileStore.update(next)} />
	</section>

	<section class="card stack">
		<h2>{t('profile.text')}</h2>
		<div class="chip-grid" role="group" aria-label={t('profile.text')}>
			<button type="button" class="chip" aria-pressed={profile.textSize === 'normal'} onclick={() => profileStore.update({ textSize: 'normal' })}>
				{t('profile.textNormal')}
			</button>
			<button type="button" class="chip" aria-pressed={profile.textSize === 'large'} onclick={() => profileStore.update({ textSize: 'large' })}>
				{t('profile.textLarge')}
			</button>
		</div>
	</section>

	<SyncPanel />

	<button class="btn btn-secondary" type="button" onclick={reset}>{t('profile.reset')}</button>
</div>

<style>
	.card {
		padding: 16px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
		gap: 12px;
	}

	.current {
		font-weight: 850;
	}

	.input {
		width: 100%;
		min-height: 52px;
		padding: 0 16px;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-button);
		background: var(--color-bg);
		font-size: var(--text-body);
	}

	.apkaimes {
		max-height: 320px;
		overflow-y: auto;
		padding: 2px;
	}
</style>
