<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import AskQuestion from '$lib/components/AskQuestion.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import SearchBar, { type Scope } from '$lib/components/SearchBar.svelte';
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import { nextQuestion, type QuestionId } from '$lib/ask';
	import { formatDistance } from '$lib/format';
	import { t } from '$lib/i18n';
	import { canLocate } from '$lib/locate';
	import { RIGA } from '$lib/profile';
	import { pickElsewhere, pickNearby, reasonLabels } from '$lib/rank';
	import { eventStore } from '$lib/stores/events.svelte';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { CATEGORY_TINT } from '$shared/categories';
	import { CATEGORY_IDS, type EventCore } from '$shared/types';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { onMount } from 'svelte';

	let mounted = $state(false);
	let now = $state(new Date());
	let query = $state('');
	let scope = $state<Scope>('nearby');
	let question = $state<QuestionId | undefined>(undefined);

	const profile = $derived(profileStore.value);
	const showOnboarding = $derived(mounted && !profile.onboarded);
	const ready = $derived(eventStore.status === 'ready');
	const nearby = $derived(ready ? pickNearby(eventStore.events, profile, now) : undefined);
	const elsewhere = $derived(
		ready && nearby ? pickElsewhere(eventStore.events, profile, now, nearby.radiusKm, 3) : []
	);
	/** The user's own interests first, then the rest, 6 in all; the rest are one tap away. */
	const browseCats = $derived([...profile.cats, ...CATEGORY_IDS.filter((cat) => !profile.cats.includes(cat))].slice(0, 6));
	const placeName = $derived(nearby?.origin.apkaime?.name ?? nearby?.origin.place.name ?? RIGA.name);

	onMount(() => {
		mounted = true;
		eventStore.load();
		const timer = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(timer);
	});

	$effect(() => {
		if (!mounted || !profile.onboarded || question) return;
		const shownKey = 'iziet.askShown';
		let shown = false;
		try {
			shown = sessionStorage.getItem(shownKey) === '1';
		} catch {
			shown = false;
		}
		const next = nextQuestion(profile, {
			now,
			canInstall: !!ui.installPrompt,
			canLocate: canLocate(),
			shownThisSession: shown
		});
		if (next) {
			question = next;
			try {
				sessionStorage.setItem(shownKey, '1');
			} catch {
				// Private mode: the question may show again next visit, which is acceptable.
			}
		}
	});

	function onSearch(value: string, nextScope: Scope) {
		if (!value.trim()) return;
		const kur = nextScope === 'all' ? 'latvija' : 'tuvuma';
		goto(`${base}/meklet?q=${encodeURIComponent(value)}&kur=${kur}`, { keepFocus: true });
	}

	/** The scope toggle opens search with the best events for that scope, before any typing. */
	function onScope(nextScope: Scope) {
		const kur = nextScope === 'all' ? 'latvija' : 'tuvuma';
		const q = query.trim() ? `q=${encodeURIComponent(query)}&` : '';
		goto(`${base}/meklet?${q}kur=${kur}`);
	}

	/** The event page counts category opens; home only counts opens from "Citur Latvijā". */
	function trackOpen(_event: EventCore, elsewhereBlock = false) {
		if (!elsewhereBlock) return;
		profileStore.update((p) => ({ elsewhereOpens: p.elsewhereOpens + 1 }), { prefs: false });
	}
</script>

{#if !mounted || showOnboarding}
	<div class="page onboarding-wrap">
		<Onboarding ondone={() => window.scrollTo({ top: 0 })} />
	</div>
{/if}

{#if !mounted || !showOnboarding}
	<div class="page home-content stack">
		<SearchBar bind:value={query} bind:scope oninput={onSearch} onscope={onScope} onsubmit={onSearch} />

		{#if question}
			<AskQuestion id={question} ondone={() => (question = undefined)} />
		{/if}

		<section class="block" aria-labelledby="nearby-title">
			<div class="block-head">
				<h2 id="nearby-title">{t('home.nearby')}</h2>
				<a class="place" href={`${base}/iestatijumi`}>
					{t('home.place', { place: placeName })} · <span class="link">{t('home.change')}</span>
				</a>
			</div>

			{#if eventStore.status === 'error'}
				<div class="empty">
					<p>{t('error.load')}</p>
					<button class="btn btn-secondary" type="button" onclick={() => eventStore.load(true)}>{t('error.retry')}</button>
				</div>
			{:else if !ready || !nearby}
				<SkeletonCard large />
				<p class="visually-hidden" role="status">{t('home.loading')}</p>
			{:else if nearby.picks.length === 0}
				<div class="empty">
					<Mascot size={68} decorative />
					<div>
						<p class="empty-title">{t('home.emptyNearby')}</p>
						{#if nearby.nearestTown}
							<p>{t('home.nearestTown', { town: nearby.nearestTown.name, distance: formatDistance(nearby.nearestTown.km) })}</p>
							<a
								class="btn btn-primary"
								href={`${base}/saraksts?skats=visi${nearby.nearestTown.placeId ? `&vieta=${nearby.nearestTown.placeId}` : ''}`}
							>
								{t('home.seeTown', { town: nearby.nearestTown.name })}
							</a>
						{/if}
					</div>
				</div>
			{:else}
				<div class="cards">
					{#each nearby.picks as item, index (item.event.id)}
						<EventCard
							event={item.event}
							{now}
							km={item.km}
							labels={reasonLabels(item, profile, now)}
							variant={index === 0 ? 'large' : 'compact'}
							priority={index === 0}
							onopen={(event) => trackOpen(event)}
						/>
					{/each}
				</div>
			{/if}
			<a class="more" href={`${base}/saraksts?skats=tuvuma`}>{t('home.showMore')}<ChevronRight size={22} aria-hidden="true" /></a>
		</section>

		<section class="block" aria-labelledby="elsewhere-title">
			<div class="block-head">
				<h2 id="elsewhere-title">{t('home.elsewhere')}</h2>
			</div>
			{#if !ready}
				<SkeletonCard />
				<SkeletonCard />
			{:else if elsewhere.length === 0}
				<p class="muted">{t('home.emptyElsewhere')}</p>
			{:else}
				<div class="cards">
					{#each elsewhere as item (item.event.id)}
						<EventCard
							event={item.event}
							{now}
							km={item.km}
							labels={reasonLabels(item, profile, now)}
							onopen={(event) => trackOpen(event, true)}
						/>
					{/each}
				</div>
			{/if}
			<a class="more" href={`${base}/saraksts?skats=latvija`}>{t('home.showMore')}<ChevronRight size={22} aria-hidden="true" /></a>
		</section>

		<section class="block" aria-labelledby="browse-title">
			<h2 id="browse-title">{t('home.browse')}</h2>
			<div class="chip-grid">
				{#each browseCats as cat (cat)}
					<a class="chip cat-chip" href={`${base}/saraksts?skats=visi&kat=${cat}`} style:--ink={`var(--cat-${CATEGORY_TINT[cat]}-icon)`}>
						<span class="dot" aria-hidden="true"></span>{t(`cat.${cat}`)}
					</a>
				{/each}
				<a class="chip cat-chip all" href={`${base}/kategorijas`}>{t('home.allCategories')}</a>
			</div>
		</section>
	</div>
{/if}

<style>
	:global(html:not(.first-visit)) .onboarding-wrap {
		display: none;
	}

	:global(html.first-visit) .home-content {
		display: none;
	}

	.home-content {
		gap: 28px;
	}

	.block {
		display: grid;
		gap: 12px;
	}

	.block-head {
		display: grid;
		gap: 2px;
	}

	.place {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		column-gap: 0.3em;
		min-height: var(--tap-min);
		font-size: var(--text-small);
		color: var(--color-text-muted);
		text-decoration: none;

	}

	.cards {
		display: grid;
		gap: 12px;
	}

	.more {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-height: var(--tap-min);
		border-radius: var(--radius-button);
		border: 2px solid var(--color-border);
		background: var(--color-surface);
		font-weight: 800;
		text-decoration: none;
	}

	.empty {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		padding: 16px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}

	.empty > div {
		display: grid;
		gap: 10px;
	}

	.empty-title {
		font-weight: 850;
	}

	.cat-chip {
		text-decoration: none;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--ink);
	}
</style>
