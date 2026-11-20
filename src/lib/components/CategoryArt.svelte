<script lang="ts">
	import { CATEGORY_TINT } from '$shared/categories';
	import type { CategoryId } from '$shared/types';

	/** Fallback illustration when an event has no image: drawing on the category tint. */
	let { cat, compact = false }: { cat: CategoryId; compact?: boolean } = $props();
	const tint = $derived(CATEGORY_TINT[cat] ?? 'nisas');
</script>

<div class="art" class:compact style:--tint={`var(--cat-${tint})`} style:--ink={`var(--cat-${tint}-icon)`} aria-hidden="true">
	<svg viewBox="0 0 64 64" class="icon">
		<g fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
			{#if cat === 'koncerti'}
				<rect x="22" y="8" width="14" height="24" rx="7" fill="var(--paper)" />
				<path d="M17 26 Q17 38 29 38 Q41 38 41 26 M29 38 V48 M22 52 H36" />
				<path d="M46 14 V28 M46 14 L54 11 V24" />
				<circle cx="43.5" cy="28" r="3" fill="var(--ink)" />
				<circle cx="51.5" cy="24" r="3" fill="var(--ink)" />
			{:else if cat === 'teatris'}
				<path d="M8 14 Q20 8 32 14 Q32 30 20 36 Q8 30 8 14 Z" fill="var(--paper)" />
				<path d="M14 20 Q15 18 17 20 M23 20 Q24 18 26 20 M14 27 Q20 33 26 27" />
				<path d="M32 24 Q44 18 56 24 Q56 40 44 46 Q32 40 32 24 Z" fill="var(--paper)" />
				<path d="M38 30 Q39 28 41 30 M47 30 Q48 28 50 30 M38 40 Q44 35 50 40" />
			{:else if cat === 'izstades'}
				<rect x="10" y="12" width="44" height="36" rx="3" fill="var(--paper)" />
				<rect x="15" y="17" width="34" height="26" rx="2" />
				<path d="M15 39 L26 28 L34 36 L39 31 L49 41" />
				<circle cx="40" cy="23" r="3.5" fill="var(--ink)" />
				<path d="M24 52 L20 58 M40 52 L44 58" />
			{:else if cat === 'festivali'}
				<path d="M6 14 Q32 26 58 14" />
				<path d="M11 16 L14 28 L19 18 Z M24 20 L27 32 L32 21 Z M37 21 L40 32 L45 19 Z M49 17 L51 28 L56 15 Z" fill="var(--paper)" />
				<path d="M32 40 L34.5 45.5 L40.5 46 L36 50 L37.5 56 L32 53 L26.5 56 L28 50 L23.5 46 L29.5 45.5 Z" fill="var(--ink)" />
			{:else if cat === 'gimenem'}
				<ellipse cx="22" cy="20" rx="9" ry="11" fill="var(--paper)" />
				<ellipse cx="40" cy="16" rx="9" ry="11" fill="var(--paper)" />
				<path d="M22 31 Q24 42 30 56 M40 27 Q38 42 30 56" />
				<path d="M20 31 H24 M38 27 H42" />
				<path d="M18 16 Q19 13 22 12" />
			{:else if cat === 'ediens'}
				<path d="M8 32 H56 Q54 50 32 50 Q10 50 8 32 Z" fill="var(--paper)" />
				<path d="M20 54 H44" />
				<path d="M22 24 Q19 19 22 14 Q25 9 22 6 M32 24 Q29 19 32 14 Q35 9 32 6 M42 24 Q39 19 42 14 Q45 9 42 6" />
			{:else if cat === 'tirdzini'}
				<path d="M10 28 H54 L49 54 H15 Z" fill="var(--paper)" />
				<path d="M20 28 Q32 6 44 28 M18 38 H46 M17 46 H47" />
				<path d="M27 22 L22 12 M27 22 Q31 14 36 16" />
				<circle cx="40" cy="22" r="5" fill="var(--ink)" />
			{:else if cat === 'blusu'}
				<path d="M14 30 Q14 52 32 52 Q50 52 50 30 Z" fill="var(--paper)" />
				<path d="M14 30 H50 M24 30 Q24 22 32 22 Q40 22 40 30 M32 18 V22" />
				<path d="M50 34 Q60 34 57 44 Q55 48 49 46" />
				<path d="M14 36 Q6 34 5 26" />
				<circle cx="32" cy="16" r="2.5" fill="var(--ink)" />
			{:else if cat === 'sports'}
				<circle cx="32" cy="32" r="22" fill="var(--paper)" />
				<path d="M32 22 L41 28 L38 39 H26 L23 28 Z" fill="var(--ink)" />
				<path d="M32 10 V22 M41 28 L53 24 M38 39 L45 50 M26 39 L19 50 M23 28 L11 24" />
			{:else if cat === 'darbnicas'}
				<path d="M32 8 Q56 8 56 30 Q56 40 46 40 Q40 40 40 46 Q40 56 30 56 Q8 56 8 32 Q8 8 32 8 Z" fill="var(--paper)" />
				<circle cx="22" cy="24" r="4" fill="var(--ink)" />
				<circle cx="34" cy="18" r="4" />
				<circle cx="45" cy="25" r="4" fill="var(--ink)" />
				<circle cx="20" cy="38" r="4" />
			{:else if cat === 'anime'}
				<path d="M12 24 Q14 18 22 18 H42 Q50 18 52 24 L58 42 Q60 50 52 50 Q48 50 44 44 H20 Q16 50 12 50 Q4 50 6 42 Z" fill="var(--paper)" />
				<path d="M20 28 V38 M15 33 H25" />
				<circle cx="43" cy="29" r="2.5" fill="var(--ink)" />
				<circle cx="48" cy="35" r="2.5" fill="var(--ink)" />
			{:else}
				<rect x="8" y="20" width="48" height="32" rx="6" fill="var(--paper)" />
				<path d="M22 20 L26 13 H38 L42 20" />
				<circle cx="32" cy="36" r="10" />
				<circle cx="32" cy="36" r="4" fill="var(--ink)" />
				<circle cx="48" cy="27" r="2" fill="var(--ink)" />
			{/if}
		</g>
	</svg>
</div>

<style>
	.art {
		--paper: color-mix(in srgb, var(--color-surface) 80%, transparent);
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background-color: var(--tint);
		background-image: radial-gradient(color-mix(in srgb, var(--ink) 16%, transparent) 1.5px, transparent 1.6px);
		background-size: 18px 18px;
	}

	.icon {
		width: 38%;
		max-width: 120px;
		height: auto;
	}

	.compact .icon {
		width: 58%;
	}
</style>
