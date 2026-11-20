<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import BackLink from '$lib/components/BackLink.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import EventImage from '$lib/components/EventImage.svelte';
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import { downloadIcs } from '$lib/calendar';
	import { formatDistance, formatPriceRange, formatShowTime, formatWhenLong } from '$lib/format';
	import { has, t } from '$lib/i18n';
	import { resolveOrigin } from '$lib/profile';
	import { distanceKm, eventPoint, listEvents, reasonLabels } from '$lib/rank';
	import { eventStore } from '$lib/stores/events.svelte';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { savedStore } from '$lib/stores/saved.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { CATEGORY_TINT } from '$shared/categories';
	import type { EventItem } from '$shared/types';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Heart from '@lucide/svelte/icons/heart';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Navigation from '@lucide/svelte/icons/navigation';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Ticket from '@lucide/svelte/icons/ticket';
	import { onMount } from 'svelte';

	let now = $state(new Date());
	const id = $derived(browser ? (page.url.searchParams.get('id') ?? '') : '');
	let full = $state.raw<EventItem | undefined>(undefined);
	let requested = '';
	const core = $derived(eventStore.byId.get(id));
	const event = $derived<EventItem | undefined>(
		full?.id === id ? full : core ? ({ tickets: [], sources: [], url: '', ...core } as EventItem) : undefined
	);
	const origin = $derived(resolveOrigin(profileStore.value));

	$effect(() => {
		const current = id;
		if (!current || requested === current) return;
		requested = current;
		eventStore.details(current).then((loaded) => {
			if (loaded?.id === id) full = loaded;
		});
	});
	const km = $derived(event ? distanceKm(origin, event) : undefined);
	const saved = $derived(event ? savedStore.ids.includes(event.id) : false);
	const price = $derived(event ? formatPriceRange(event.price) : undefined);
	const tint = $derived(event ? CATEGORY_TINT[event.cat] : 'nisas');
	let showAllTimes = $state(false);

	const directions = $derived.by(() => {
		if (!event) return undefined;
		const point = eventPoint(event);
		const destination = point ? `${point.lat},${point.lng}` : [event.venue, event.address, event.town].filter(Boolean).join(', ');
		return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
	});

	const similar = $derived(
		event && eventStore.status === 'ready'
			? listEvents(eventStore.events, profileStore.value, now, { scope: 'nearby', cat: event.cat })
					.filter((item) => item.event.id !== event.id)
					.slice(0, 3)
			: []
	);

	onMount(() => {
		eventStore.load();
	});

	let tracked = '';
	$effect(() => {
		if (!event || tracked === event.id) return;
		tracked = event.id;
		const cat = event.cat;
		profileStore.update((p) => ({ opens: { ...p.opens, [cat]: (p.opens[cat] ?? 0) + 1 } }));
	});

	async function share() {
		if (!event) return;
		const url = window.location.href;
		try {
			if (navigator.share) {
				await navigator.share({ title: event.title, url });
				return;
			}
			await navigator.clipboard.writeText(url);
			ui.showToast(t('event.copied'));
		} catch {
			// The user closed the share sheet; nothing to do.
		}
	}

	function toggleSave() {
		if (!event) return;
		const nowSaved = savedStore.toggle(event.id);
		ui.showToast(nowSaved ? t('event.saved') : t('card.unsave'));
	}
</script>

<svelte:head>
	<title>{event ? event.title : t('app.name')} · {t('app.name')}</title>
</svelte:head>

<div class="page stack">
	<BackLink />

	{#if eventStore.status !== 'ready' && !event}
		<SkeletonCard large />
	{:else if !event}
		<div class="stack">
			<h1>{t('event.notFound')}</h1>
			<a class="btn btn-primary" href={`${base}/`}>{t('event.backHome')}</a>
		</div>
	{:else}
		<article class="event stack" style:--tint={`var(--cat-${tint})`} style:--ink={`var(--cat-${tint}-icon)`}>
			<EventImage src={event.img} cat={event.cat} priority />

			<div class="head">
				<a class="cat" href={`${base}/saraksts?skats=visi&kat=${event.cat}`}><span class="dot" aria-hidden="true"></span>{t(`cat.${event.cat}`)}</a>
				{#if event.status}<span class="status">{t(`event.${event.status}`)}</span>{/if}
				<h1>{event.title}</h1>
			</div>

			<dl class="facts">
				<div>
					<dt><Calendar size={20} aria-hidden="true" /><span class="visually-hidden">{t('event.when')}</span></dt>
					<dd>
						{formatWhenLong(event, now)}
						{#if event.times?.length}
							<button class="more-times" type="button" aria-expanded={showAllTimes} onclick={() => (showAllTimes = !showAllTimes)}>
								{t('event.moreDates')} ({event.times.length})
							</button>
							{#if showAllTimes}
								<ul class="times">
									{#each event.times as time (time)}<li>{formatShowTime(time)}</li>{/each}
								</ul>
							{/if}
						{/if}
					</dd>
				</div>
				<div>
					<dt><MapPin size={20} aria-hidden="true" /><span class="visually-hidden">{t('event.where')}</span></dt>
					<dd>
						{#if event.venue}<strong>{event.venue}</strong><br />{/if}
						{event.address && event.address.includes(event.town) ? event.address : [event.address, event.town].filter(Boolean).join(', ')}
						{#if km !== undefined}{' · '}<span class="distance">{t('card.distance', { distance: formatDistance(km) })}</span>{/if}
					</dd>
				</div>
				{#if price}
					<div>
						<dt><Ticket size={20} aria-hidden="true" /><span class="visually-hidden">{t('event.price')}</span></dt>
						<dd class:free={event.price?.free}>{price}</dd>
					</div>
				{/if}
			</dl>

			{#if event.tickets.length}
				<div class="tickets">
					{#each event.tickets as ticket, index (ticket.url)}
						<a
							class="btn {index === 0 ? 'btn-primary' : 'btn-secondary'} btn-block"
							href={ticket.url}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Ticket size={20} aria-hidden="true" />
							{event.tickets.length === 1 ? t('event.buyTickets') : t('event.ticketsAt', { seller: ticket.seller })}
						</a>
					{/each}
				</div>
			{/if}

			<div class="actions">
				<a class="action" href={directions} target="_blank" rel="noopener noreferrer"><Navigation size={22} aria-hidden="true" />{t('event.directions')}</a>
				<button class="action" type="button" onclick={() => downloadIcs(event)}><CalendarPlus size={22} aria-hidden="true" />{t('event.addToCalendar')}</button>
				<button class="action" type="button" onclick={share}><Share2 size={22} aria-hidden="true" />{t('event.share')}</button>
				<button class="action" type="button" aria-pressed={saved} onclick={toggleSave}>
					<Heart size={22} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{saved ? t('event.saved') : t('event.save')}
				</button>
			</div>

			{#if event.desc}
				<section class="desc">
					<h2>{t('event.about')}</h2>
					<p>{event.desc}</p>
				</section>
			{/if}

			<dl class="meta">
				{#if event.lang?.length}
					<div><dt>{t('event.language')}</dt><dd>{event.lang.map((code) => (has(`lang.${code}`) ? t(`lang.${code}`) : code)).join(', ')}</dd></div>
				{/if}
				{#if event.adult}
					<div><dt>{t('event.ages')}</dt><dd>{t('event.adult')}</dd></div>
				{:else if event.ageMin !== undefined && event.ageMax !== undefined}
					<div><dt>{t('event.ages')}</dt><dd>{t('event.ageRange', { min: event.ageMin, max: event.ageMax })}</dd></div>
				{:else if event.ageMin !== undefined}
					<div><dt>{t('event.ages')}</dt><dd>{t('event.ageFrom', { age: event.ageMin })}</dd></div>
				{/if}
				<div>
					<dt>{event.sources.length > 1 ? t('event.sources') : t('event.source')}</dt>
					<dd>
						{#each event.sources as source, index (source.id + source.url)}
							{#if index > 0}, {/if}<a class="link" href={source.url} target="_blank" rel="noopener noreferrer">{source.name}<ExternalLink size={14} aria-hidden="true" /></a>
						{/each}
					</dd>
				</div>
			</dl>
			<p class="muted small">{t('event.disclaimer')}</p>
		</article>

		{#if similar.length}
			<section class="stack">
				<h2>{t('event.similar')}</h2>
				{#each similar as item (item.event.id)}
					<EventCard event={item.event} {now} km={item.km} labels={reasonLabels(item, profileStore.value, now)} />
				{/each}
			</section>
		{/if}
	{/if}
</div>

<style>
	.event {
		gap: 18px;
	}

	.head {
		display: grid;
		gap: 6px;
		justify-items: start;
	}

	.cat {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		padding: 2px 14px;
		border-radius: var(--radius-chip);
		background: var(--tint);
		font-weight: 800;
		font-size: var(--text-small);
		text-decoration: none;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--ink);
	}

	.status {
		padding: 2px 12px;
		border-radius: var(--radius-chip);
		background: var(--color-text);
		color: var(--color-surface);
		font-weight: 800;
	}

	.facts {
		display: grid;
		gap: 12px;
		margin: 0;
		padding: 16px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}

	.facts > div {
		display: grid;
		grid-template-columns: 28px 1fr;
		gap: 10px;
	}

	.facts dt {
		color: var(--color-text-muted);
		padding-top: 3px;
	}

	.facts dd {
		margin: 0;
	}

	.distance {
		font-weight: 800;
	}

	.free {
		color: var(--color-success);
		font-weight: 850;
	}

	.more-times {
		display: block;
		margin-top: 4px;
		min-height: 44px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-primary);
		font-weight: 800;
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	.times {
		margin: 4px 0 0;
		padding-left: 20px;
		font-size: var(--text-small);
	}

	.tickets {
		display: grid;
		gap: 10px;
	}

	.tickets .btn {
		min-height: 56px;
	}

	.actions {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}

	.action {
		display: grid;
		justify-items: center;
		align-content: center;
		gap: 4px;
		min-height: 72px;
		padding: 8px 4px;
		border: 2px solid var(--color-border-subtle);
		border-radius: var(--radius-button);
		background: var(--color-surface);
		font-size: 1rem;
		font-weight: 750;
		line-height: 1.15;
		text-align: center;
		text-decoration: none;
	}

	.action[aria-pressed='true'] {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	.desc {
		display: grid;
		gap: 8px;
	}

	.desc p {
		white-space: pre-line;
	}

	.meta {
		display: grid;
		gap: 8px;
		margin: 0;
	}

	.meta > div {
		display: grid;
		gap: 2px;
	}

	.meta dt {
		font-weight: 800;
		font-size: var(--text-small);
		color: var(--color-text-muted);
	}

	.meta dd {
		margin: 0;
	}

	.meta a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 44px;
	}

	.small {
		font-size: var(--text-small);
	}
</style>
