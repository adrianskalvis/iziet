<script lang="ts">
	import { base } from '$app/paths';
	import { formatDistance, formatPrice, formatWhen } from '$lib/format';
	import { has, t } from '$lib/i18n';
	import type { Label } from '$lib/rank';
	import { savedStore } from '$lib/stores/saved.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { CATEGORY_TINT } from '$shared/categories';
	import type { EventCore } from '$shared/types';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Heart from '@lucide/svelte/icons/heart';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Ticket from '@lucide/svelte/icons/ticket';
	import EventImage from './EventImage.svelte';

	let {
		event,
		now,
		km,
		labels = [],
		variant = 'compact',
		priority = false,
		level = 3,
		onopen
	}: {
		event: EventCore;
		now: Date;
		km?: number;
		labels?: Label[];
		variant?: 'large' | 'compact';
		priority?: boolean;
		/** Heading level of the title: 2 on pages without section headings, else 3. */
		level?: 2 | 3;
		onopen?: (event: EventCore) => void;
	} = $props();

	const when = $derived(formatWhen(event, now));
	const price = $derived(formatPrice(event.price));
	const place = $derived([event.venue, event.town].filter(Boolean).join(', '));
	const saved = $derived(savedStore.ids.includes(event.id));
	const tint = $derived(CATEGORY_TINT[event.cat]);
	const href = $derived(`${base}/pasakums?id=${encodeURIComponent(event.id)}`);

	function labelText(label: Label): string {
		if (label.params?.tag) {
			const tagKey = label.params.tag;
			return t(label.key, { tag: has(tagKey) ? t(tagKey).toLowerCase() : tagKey.replace('tag.', '') });
		}
		return t(label.key);
	}

	function toggleSave() {
		const nowSaved = savedStore.toggle(event.id);
		ui.showToast(nowSaved ? t('event.saved') : t('card.unsave'));
	}
</script>

<article class="card {variant}" style:--tint={`var(--cat-${tint})`} style:--ink={`var(--cat-${tint}-icon)`}>
	<div class="media">
		<EventImage src={event.img} cat={event.cat} variant={variant === 'large' ? 'hero' : 'thumb'} {priority} />
		{#if event.status}
			<span class="status">{t(`event.${event.status}`)}</span>
		{/if}
	</div>

	<div class="body">
		<p class="cat"><span class="dot" aria-hidden="true"></span>{t(`cat.${event.cat}`)}</p>
		<svelte:element this={`h${level}`} class="title">
			<a {href} class="stretched" onclick={() => onopen?.(event)}>{event.title}</a>
		</svelte:element>
		<ul class="facts">
			<li><Calendar size={18} aria-hidden="true" /><span>{when}</span></li>
			<li>
				<MapPin size={18} aria-hidden="true" />
				<span class="place">{place}{#if km !== undefined}{' · '}<span class="distance">{formatDistance(km)}</span>{/if}</span>
			</li>
			{#if price}
				<li class:free={event.price?.free}><Ticket size={18} aria-hidden="true" /><span>{price}</span></li>
			{/if}
		</ul>
		{#if labels.length}
			<ul class="reasons" aria-label={t('card.why')}>
				{#each labels as label (label.key + (label.params?.tag ?? ''))}
					<li>{labelText(label)}</li>
				{/each}
			</ul>
		{/if}
	</div>

	<button
		class="save"
		type="button"
		aria-pressed={saved}
		aria-label={saved ? t('card.unsave') : t('card.save')}
		onclick={toggleSave}
	>
		<Heart size={22} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
	</button>
</article>

<style>
	.card {
		position: relative;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
		transition: transform var(--motion-fast) var(--ease-out);
	}

	.card:active {
		transform: scale(0.985);
	}

	.card:has(.stretched:focus-visible) {
		outline: var(--focus-ring);
		outline-offset: var(--focus-offset);
	}

	.large {
		padding: 10px 10px 16px;
	}

	.large .body {
		padding: 12px 8px 0;
	}

	.compact {
		display: grid;
		grid-template-columns: 104px 1fr;
		gap: 14px;
		padding: 10px 10px 12px;
		align-items: start;
	}

	.compact .body {
		padding-right: 40px;
		min-width: 0;
	}

	.media {
		position: relative;
	}

	.status {
		position: absolute;
		left: 8px;
		top: 8px;
		padding: 4px 10px;
		border-radius: var(--radius-chip);
		background: var(--color-text);
		color: var(--color-surface);
		font-size: 1rem;
		font-weight: 800;
	}

	.cat {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: var(--text-small);
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--ink);
		flex: none;
	}

	.title {
		margin: 2px 0 6px;
		font-size: var(--text-card-title);
		font-weight: 850;
		line-height: 1.25;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.compact .title {
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.stretched {
		text-decoration: none;
	}

	.stretched:focus-visible {
		outline: none;
	}

	.stretched::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: var(--radius-card);
	}

	.facts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 2px;
		font-size: var(--text-small);
	}

	.facts li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.facts :global(svg) {
		flex: none;
		margin-top: 3px;
		color: var(--color-text-muted);
	}

	.place {
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
	}

	.large .place {
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.distance {
		font-weight: 800;
		white-space: nowrap;
	}

	.free {
		color: var(--color-success);
		font-weight: 800;
	}

	.reasons {
		list-style: none;
		margin: 10px 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.reasons li {
		padding: 3px 12px;
		border-radius: var(--radius-chip);
		background: var(--tint);
		font-size: 1rem;
		font-weight: 750;
	}

	.save {
		position: absolute;
		z-index: 2;
		display: grid;
		place-items: center;
		width: var(--tap-min);
		height: var(--tap-min);
		border: 0;
		border-radius: 50%;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-surface) 88%, transparent);
		-webkit-tap-highlight-color: transparent;
	}

	.large .save {
		top: 18px;
		right: 18px;
		box-shadow: var(--shadow-card);
	}

	.compact .save {
		top: 4px;
		right: 4px;
		background: transparent;
	}
</style>
