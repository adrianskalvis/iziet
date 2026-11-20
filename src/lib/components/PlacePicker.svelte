<script lang="ts" module>
	import type { LatLng } from '$shared/geo';

	export type PlaceChoice =
		| { placeId: string; geo?: undefined; apkaime?: undefined }
		| { geo: LatLng; apkaime?: string; placeId?: undefined };
</script>

<script lang="ts">
	import { t } from '$lib/i18n';
	import { canLocate, findApkaime, requestLocation } from '$lib/locate';
	import { CITY_CHIPS } from '$lib/profile';
	import { fold } from '$shared/fold';
	import { PLACES } from '$shared/places.generated';
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';

	let {
		placeId,
		hasGeo = false,
		onchange
	}: { placeId?: string; hasGeo?: boolean; onchange: (choice: PlaceChoice) => void } = $props();

	let locating = $state(false);
	let denied = $state(false);
	let showSearch = $state(false);
	let query = $state('');

	const extra = $derived(placeId && !CITY_CHIPS.some((p) => p.id === placeId) ? PLACES.find((p) => p.id === placeId) : undefined);
	const matches = $derived(
		query.trim().length < 2
			? []
			: PLACES.filter((p) => fold(p.name).includes(fold(query.trim()))).slice(0, 8)
	);

	async function locate() {
		locating = true;
		denied = false;
		try {
			const geo = await requestLocation();
			const apkaime = await findApkaime(geo);
			onchange({ geo, apkaime });
		} catch {
			denied = true;
		} finally {
			locating = false;
		}
	}
</script>

<div class="picker">
	{#if canLocate()}
		<button class="btn btn-primary btn-block locate" type="button" onclick={locate} disabled={locating} aria-pressed={hasGeo}>
			<LocateFixed size={22} aria-hidden="true" />
			{locating ? t('onboarding.locating') : t('onboarding.useLocation')}
		</button>
		<p class="muted reason">{t('onboarding.locationReason')}</p>
	{/if}
	{#if denied}
		<p class="warning" role="alert">{t('onboarding.locationDenied')}</p>
	{/if}

	<p class="label">{t('onboarding.orCity')}</p>
	<div class="chip-grid" role="group" aria-label={t('onboarding.orCity')}>
		{#each [...CITY_CHIPS, ...(extra ? [extra] : [])] as place (place.id)}
			<button
				type="button"
				class="chip"
				aria-pressed={!hasGeo && placeId === place.id}
				onclick={() => onchange({ placeId: place.id })}
			>
				{place.name}
			</button>
		{/each}
		<button type="button" class="chip" aria-expanded={showSearch} onclick={() => (showSearch = !showSearch)}>
			{t('onboarding.otherPlace')}
		</button>
	</div>

	{#if showSearch}
		<label class="search">
			<span class="visually-hidden">{t('onboarding.placeSearch')}</span>
			<input type="search" bind:value={query} placeholder={t('onboarding.placeSearch')} autocomplete="off" />
		</label>
		{#if query.trim().length >= 2}
			<ul class="results">
				{#each matches as place (place.id)}
					<li>
						<button
							type="button"
							class="chip"
							onclick={() => {
								onchange({ placeId: place.id });
								showSearch = false;
								query = '';
							}}
						>
							{place.name}
						</button>
					</li>
				{:else}
					<li class="muted">{t('onboarding.noPlace')}</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.picker {
		display: grid;
		gap: 12px;
	}

	.locate {
		min-height: 56px;
	}

	.reason {
		font-size: var(--text-small);
	}

	.warning {
		padding: 10px 14px;
		border-radius: 12px;
		background: var(--color-warning-tint);
		color: var(--color-warning);
		font-weight: 750;
	}

	.label {
		margin-top: 8px;
		font-weight: 800;
	}

	.search input {
		width: 100%;
		min-height: 52px;
		padding: 0 16px;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-button);
		background: var(--color-surface);
		font-size: var(--text-body);
	}

	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
</style>
