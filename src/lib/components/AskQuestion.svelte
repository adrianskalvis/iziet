<script lang="ts">
	import { answered, dismissed, type QuestionId } from '$lib/ask';
	import { t } from '$lib/i18n';
	import { findApkaime, requestLocation } from '$lib/locate';
	import { KIDS_AGES, type KidsAge, type Profile, type TimePref } from '$lib/profile';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { fold } from '$shared/fold';
	import { APKAIMES } from '$shared/places.generated';
	import AskCard from './AskCard.svelte';

	let { id, ondone }: { id: QuestionId; ondone: () => void } = $props();

	let kids = $state<KidsAge[]>([]);
	let times = $state<TimePref[]>([]);
	let apkaimeQuery = $state('');
	let busy = $state(false);

	const apkaimeMatches = $derived(
		[...APKAIMES]
			.filter((a) => !apkaimeQuery.trim() || fold(a.name).includes(fold(apkaimeQuery.trim())))
			.sort((a, b) => a.name.localeCompare(b.name, 'lv'))
			.slice(0, apkaimeQuery.trim() ? 12 : 8)
	);

	function finish(patch: Partial<Profile>) {
		const now = new Date();
		profileStore.update((p) => ({ ...patch, ...answered(p, id, now) }));
		ui.showToast(t('ask.thanks'));
		ondone();
	}

	function later() {
		profileStore.update((p) => dismissed(p, id, new Date()));
		ondone();
	}

	async function useLocation() {
		busy = true;
		try {
			const geo = await requestLocation();
			const apkaime = await findApkaime(geo);
			finish({ geo: { ...geo, at: new Date().toISOString() }, apkaime });
		} catch {
			ui.showToast(t('onboarding.locationDenied'));
			later();
		} finally {
			busy = false;
		}
	}

	async function install() {
		await ui.installPrompt?.prompt();
		ui.installPrompt = null;
		finish({});
	}
</script>

{#if id === 'location'}
	<AskCard title={t('ask.location.title')} lead={t('onboarding.locationReason')} onlater={later}>
		<button class="btn btn-primary" type="button" disabled={busy} onclick={useLocation}>{t('ask.location.yes')}</button>
	</AskCard>
{:else if id === 'apkaime'}
	<AskCard title={t('ask.apkaime.title')} onlater={later}>
		<label class="field">
			<span class="visually-hidden">{t('ask.apkaime.placeholder')}</span>
			<input type="search" bind:value={apkaimeQuery} placeholder={t('ask.apkaime.placeholder')} autocomplete="off" />
		</label>
		{#each apkaimeMatches as apkaime (apkaime.id)}
			<button class="chip" type="button" onclick={() => finish({ apkaime: apkaime.id, placeId: 'Q1773' })}>{apkaime.name}</button>
		{/each}
	</AskCard>
{:else if id === 'kids'}
	<AskCard title={t('ask.kids.title')} onlater={later}>
		{#each KIDS_AGES as age (age)}
			<button
				class="chip"
				type="button"
				aria-pressed={kids.includes(age)}
				onclick={() => (kids = kids.includes(age) ? kids.filter((k) => k !== age) : [...kids, age])}
			>
				{t(`age.${age}`)}
			</button>
		{/each}
		<button class="btn btn-primary" type="button" disabled={kids.length === 0} onclick={() => finish({ kids })}>{t('onboarding.done')}</button>
	</AskCard>
{:else if id === 'distance'}
	<AskCard title={t('ask.distance.title')} onlater={later}>
		<button class="chip" type="button" onclick={() => finish({ maxTravelMin: 30 })}>{t('ask.distance.30')}</button>
		<button class="chip" type="button" onclick={() => finish({ maxTravelMin: 60 })}>{t('ask.distance.60')}</button>
		<button class="chip" type="button" onclick={() => finish({ maxTravelMin: 120 })}>{t('ask.distance.120')}</button>
		<button class="chip" type="button" onclick={() => finish({ maxTravelMin: null })}>{t('ask.distance.any')}</button>
	</AskCard>
{:else if id === 'time'}
	<AskCard title={t('ask.time.title')} onlater={later}>
		{#each ['weekday', 'saturday', 'sunday'] as const as pref (pref)}
			<button
				class="chip"
				type="button"
				aria-pressed={times.includes(pref)}
				onclick={() => (times = times.includes(pref) ? times.filter((p) => p !== pref) : [...times, pref])}
			>
				{t(`ask.time.${pref}`)}
			</button>
		{/each}
		<button class="chip" type="button" onclick={() => finish({ timePref: [] })}>{t('ask.time.any')}</button>
		<button class="btn btn-primary" type="button" disabled={times.length === 0} onclick={() => finish({ timePref: times })}>
			{t('onboarding.done')}
		</button>
	</AskCard>
{:else if id === 'price'}
	<AskCard title={t('ask.price.title')} onlater={later}>
		<button class="chip" type="button" onclick={() => finish({ priceMax: 0 })}>{t('ask.price.free')}</button>
		<button class="chip" type="button" onclick={() => finish({ priceMax: 10 })}>{t('ask.price.10')}</button>
		<button class="chip" type="button" onclick={() => finish({ priceMax: 30 })}>{t('ask.price.30')}</button>
		<button class="chip" type="button" onclick={() => finish({ priceMax: null })}>{t('ask.price.any')}</button>
	</AskCard>
{:else if id === 'install'}
	<AskCard title={t('ask.install.title')} lead={t('ask.install.lead')} onlater={later}>
		<button class="btn btn-primary" type="button" onclick={install}>{t('ask.install.yes')}</button>
	</AskCard>
{/if}

<style>
	.field {
		flex-basis: 100%;
	}

	.field input {
		width: 100%;
		min-height: 52px;
		padding: 0 16px;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-button);
		background: var(--color-surface);
		font-size: var(--text-body);
	}
</style>
