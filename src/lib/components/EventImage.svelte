<script lang="ts">
	import type { CategoryId } from '$shared/types';
	import CategoryArt from './CategoryArt.svelte';
	import { sizedImage } from '$lib/image';

	/**
	 * One image shape for every source: 3:2 hero and 1:1 thumbnail.
	 * Landscape images fill the frame. Portrait posters and square art are shown
	 * whole on a blurred copy of themselves, so faces and titles are never cut off.
	 * Missing or broken images fall back to the category illustration.
	 */
	let {
		src,
		cat,
		variant = 'hero',
		priority = false
	}: { src?: string; cat: CategoryId; variant?: 'hero' | 'thumb'; priority?: boolean } = $props();

	const HERO_WIDTH = 720;
	const THUMB_WIDTH = 240;
	const sized = $derived(src ? sizedImage(src, variant === 'hero' ? HERO_WIDTH : THUMB_WIDTH) : undefined);
	let failed = $state(false);
	let loaded = $state(false);
	let fit = $state<'cover' | 'contain'>('cover');
	const showImage = $derived(!!src && !failed);

	function onload(event: Event) {
		loaded = true;
		const image = event.currentTarget as HTMLImageElement;
		const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
		if (variant === 'hero' && (ratio < 1.15 || ratio > 2.4)) fit = 'contain';
	}
</script>

<div class="frame {variant}">
	<!-- The illustration sits underneath, so a loading or missing photo still looks finished. -->
	{#if !loaded}
		<CategoryArt {cat} compact={variant === 'thumb'} />
	{/if}
	{#if showImage}
		{#if fit === 'contain'}
			<img class="backdrop" src={sized} alt="" aria-hidden="true" referrerpolicy="no-referrer" />
		{/if}
		<img
			class="photo {fit}"
			src={sized}
			alt=""
			width={variant === 'hero' ? 720 : 192}
			height={variant === 'hero' ? 480 : 192}
			loading={priority ? 'eager' : 'lazy'}
			fetchpriority={priority ? 'high' : 'auto'}
			decoding="async"
			referrerpolicy="no-referrer"
			{onload}
			onerror={() => (failed = true)}
		/>
	{/if}
</div>

<style>
	.frame {
		position: relative;
		overflow: hidden;
		background: var(--color-border-subtle);
		isolation: isolate;
	}

	.hero {
		aspect-ratio: 3 / 2;
		border-radius: var(--radius-image);
	}

	.thumb {
		aspect-ratio: 1 / 1;
		border-radius: 12px;
	}

	.photo {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.photo.cover {
		object-fit: cover;
	}

	.photo.contain {
		object-fit: contain;
	}

	.backdrop {
		position: absolute;
		inset: -16px;
		width: calc(100% + 32px);
		height: calc(100% + 32px);
		object-fit: cover;
		filter: blur(18px) saturate(1.1);
		opacity: 0.75;
		z-index: -1;
	}
</style>
