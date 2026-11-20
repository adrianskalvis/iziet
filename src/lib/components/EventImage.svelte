<script lang="ts">
	import type { CategoryId } from '$shared/types';
	import CategoryArt from './CategoryArt.svelte';

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

	let failed = $state(false);
	let fit = $state<'cover' | 'contain'>('cover');
	const showImage = $derived(!!src && !failed);

	function onload(event: Event) {
		const image = event.currentTarget as HTMLImageElement;
		const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
		if (variant === 'hero' && (ratio < 1.15 || ratio > 2.4)) fit = 'contain';
	}
</script>

<div class="frame {variant}">
	{#if showImage}
		{#if fit === 'contain'}
			<img class="backdrop" src={src} alt="" aria-hidden="true" referrerpolicy="no-referrer" />
		{/if}
		<img
			class="photo {fit}"
			{src}
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
	{:else}
		<CategoryArt {cat} compact={variant === 'thumb'} />
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
