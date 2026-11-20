<script lang="ts">
	import { t } from '$lib/i18n';
	import { profileStore } from '$lib/stores/profile.svelte';
	import type { CategoryId } from '$shared/types';
	import type { Companion, KidsAge } from '$lib/profile';
	import CompanionPicker from './CompanionPicker.svelte';
	import InterestPicker from './InterestPicker.svelte';
	import Mascot from './Mascot.svelte';
	import PlacePicker, { type PlaceChoice } from './PlacePicker.svelte';

	/**
	 * Three skippable screens (research section 1): place, companions, interests.
	 * No text input is required and nothing is mandatory.
	 */
	let { ondone }: { ondone?: () => void } = $props();

	const TOTAL = 3;
	let step = $state(1);
	let heading = $state<HTMLElement | null>(null);

	let choice = $state.raw<PlaceChoice | null>(
		profileStore.value.geo
			? { geo: profileStore.value.geo, apkaime: profileStore.value.apkaime }
			: profileStore.value.placeId
				? { placeId: profileStore.value.placeId }
				: null
	);
	let companions = $state.raw<Companion[]>(profileStore.value.companions);
	let kids = $state.raw<KidsAge[]>(profileStore.value.kids);
	let cats = $state.raw<CategoryId[]>(profileStore.value.cats);
	let tags = $state.raw<string[]>(profileStore.value.tags);

	$effect(() => {
		void step;
		heading?.focus();
	});

	function saveStep() {
		if (step === 1 && choice) {
			profileStore.update(
				choice.geo
					? { geo: { ...choice.geo, at: new Date().toISOString() }, apkaime: choice.apkaime, placeId: undefined }
					: { placeId: choice.placeId, geo: undefined, apkaime: undefined }
			);
		}
		if (step === 2) profileStore.update({ companions, kids });
		if (step === 3) profileStore.update({ cats, tags });
	}

	function next(save = true) {
		if (save) saveStep();
		if (step < TOTAL) {
			step += 1;
			window.scrollTo({ top: 0 });
			return;
		}
		profileStore.update({ onboarded: true });
		ondone?.();
	}

	function back() {
		if (step > 1) step -= 1;
	}
</script>

<section class="onboarding" aria-labelledby="onboarding-title">
	<div class="top">
		<p class="progress" aria-live="polite">{t('onboarding.progress', { step, total: TOTAL })}</p>
		<div class="dots" aria-hidden="true">
			{#each Array.from({ length: TOTAL }, (_, i) => i + 1) as dot (dot)}
				<span class:active={dot <= step}></span>
			{/each}
		</div>
		<button type="button" class="btn btn-ghost skip" onclick={() => next(false)}>{t('onboarding.skip')}</button>
	</div>

	{#if step === 1}
		<div class="hello">
			<Mascot size={76} />
			<div class="bubble">
				<p class="hello-title">{t('onboarding.hello')}</p>
				<p>{t('onboarding.helloLead')}</p>
			</div>
		</div>
		<h1 id="onboarding-title" tabindex="-1" bind:this={heading}>{t('onboarding.placeTitle')}</h1>
		<PlacePicker
			placeId={choice?.placeId}
			hasGeo={!!choice?.geo}
			onchange={(value) => {
				choice = value;
				next();
			}}
		/>
	{:else if step === 2}
		<h1 id="onboarding-title" tabindex="-1" bind:this={heading}>{t('onboarding.companionTitle')}</h1>
		<p class="muted">{t('onboarding.companionLead')}</p>
		<CompanionPicker
			{companions}
			{kids}
			onchange={(value) => {
				companions = value.companions;
				kids = value.kids;
			}}
		/>
	{:else}
		<h1 id="onboarding-title" tabindex="-1" bind:this={heading}>{t('onboarding.interestTitle')}</h1>
		<p class="muted">{t('onboarding.interestLead')}</p>
		<InterestPicker
			{cats}
			{tags}
			onchange={(value) => {
				cats = value.cats;
				tags = value.tags;
			}}
		/>
	{/if}

	<div class="actions">
		{#if step > 1}
			<button type="button" class="btn btn-secondary" onclick={back}>{t('onboarding.back')}</button>
		{/if}
		<button type="button" class="btn btn-primary grow" onclick={() => next()}>
			{step === TOTAL ? t('onboarding.done') : t('onboarding.next')}
		</button>
	</div>
</section>

<style>
	.onboarding {
		display: grid;
		gap: 16px;
		padding-bottom: 96px;
	}

	.top {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.progress {
		font-size: var(--text-small);
		font-weight: 750;
		color: var(--color-text-muted);
	}

	.dots {
		display: flex;
		gap: 6px;
		flex: 1;
	}

	.dots span {
		width: 28px;
		height: 6px;
		border-radius: 3px;
		background: var(--color-border-subtle);
		transition: background-color var(--motion-medium);
	}

	.dots span.active {
		background: var(--color-primary);
	}

	.skip {
		margin-right: -8px;
	}

	.hello {
		display: flex;
		align-items: flex-end;
		gap: 10px;
	}

	.bubble {
		position: relative;
		flex: 1;
		padding: 12px 16px;
		border-radius: 20px 20px 20px 6px;
		background: var(--color-surface);
		box-shadow: var(--shadow-card);
		font-size: var(--text-small);
	}

	.hello-title {
		font-weight: 850;
		font-size: var(--text-body);
	}

	h1 {
		outline: none;
		margin-top: 4px;
	}

	.actions {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10;
		display: flex;
		gap: 10px;
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom));
		background: linear-gradient(to top, var(--color-bg) 70%, transparent);
	}

	.grow {
		flex: 1;
		min-height: 56px;
	}
</style>
