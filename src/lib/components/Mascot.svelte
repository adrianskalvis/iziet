<script lang="ts">
	import { t } from '$lib/i18n';

	let { size = 80, decorative = false }: { size?: number; decorative?: boolean } = $props();
</script>

<!--
	Cielaviņa: an original flat drawing of the white wagtail (baltā cielava), Latvia's national bird.
	Round white face, black cap and bib, grey back, dark wing with white edges, long black tail.
	The tail bobs; every 7 seconds the bird makes a small hop and flicks its wing.
	Keep the drawing in sync with BIRD in scripts/build-icons.ts and static/favicon.svg.
-->
<svg
	class="mascot"
	width={size}
	height={size * (100 / 120)}
	viewBox="0 0 120 100"
	role={decorative ? undefined : 'img'}
	aria-hidden={decorative ? 'true' : undefined}
	aria-label={decorative ? undefined : t('mascot.alt')}
>
	<defs><clipPath id="mascot-body"><ellipse cx="64" cy="55" rx="27" ry="15.5" transform="rotate(-12 64 55)" /></clipPath></defs>
	<g class="bird">
		<g class="tail"><path d="M43 56 L5 78.5 L6.6 82 L45 62.5 Z" fill="#101824" stroke="var(--color-mascot-line)" stroke-width="1.6" stroke-linejoin="round" /><path d="M9 80.4 L43 63" stroke="#fff" stroke-width="1.4" stroke-linecap="round" /></g>
		<path d="M61 70 L59.5 89 M70 68 L71 89 M59.5 89 H66 M71 89 H77.5" stroke="var(--color-mascot-line)" stroke-width="2" stroke-linecap="round" fill="none" />
		<ellipse cx="64" cy="55" rx="27" ry="15.5" transform="rotate(-12 64 55)" fill="#fff" />
		<path d="M78 43 Q79 56 89 63 L102 63 L102 36 Z" fill="#101824" clip-path="url(#mascot-body)" />
		<ellipse cx="64" cy="55" rx="27" ry="15.5" transform="rotate(-12 64 55)" fill="none" stroke="var(--color-mascot-line)" stroke-width="2" />
		<path d="M38 58 Q45 42 68 38 Q79 36.5 86 41 Q76 50 60 55 Q48 58.5 38 58 Z" fill="#9aa3ab" stroke="var(--color-mascot-line)" stroke-width="2" stroke-linejoin="round" />
		<g class="wing"><path d="M77 46 Q61 45.5 49 53 Q42 57.5 36 62 Q52 64.5 66 58 Q74 54 77 46 Z" fill="#3d444b" stroke="var(--color-mascot-line)" stroke-width="1.8" stroke-linejoin="round" /><path d="M44 60 Q56 53 70 50.5 M50 61.5 Q60 57 69 55" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none" /></g>
		<circle cx="89" cy="33" r="12.5" fill="#fff" stroke="var(--color-mascot-line)" stroke-width="2" />
		<path d="M94 21.5 A12.5 12.5 0 0 0 77.3 37.8 Q83.5 36 85.5 30 Q87.5 24.5 94 21.5 Z" fill="#101824" stroke="var(--color-mascot-line)" stroke-width="1.6" stroke-linejoin="round" />
		<circle cx="93.5" cy="31" r="2.3" fill="#101824" />
		<circle cx="94.3" cy="30.2" r="0.8" fill="#fff" />
		<path d="M101 30.6 L112.5 32.6 L100.8 34.6 Z" fill="#101824" stroke="var(--color-mascot-line)" stroke-width="1" stroke-linejoin="round" />
	</g>
</svg>

<style>
	.mascot {
		display: block;
		overflow: visible;
	}

	.tail {
		transform-origin: 44px 60px;
	}

	.wing {
		transform-origin: 76px 47px;
	}

	@media (prefers-reduced-motion: no-preference) {
		.tail {
			animation: wag 2.4s ease-in-out infinite;
		}

		.bird {
			animation: hop 7s ease-in-out infinite;
		}

		.wing {
			animation: flutter 7s ease-in-out infinite;
		}
	}

	@keyframes wag {
		0%,
		70%,
		100% {
			transform: rotate(0deg);
		}
		78% {
			transform: rotate(-10deg);
		}
		86% {
			transform: rotate(4deg);
		}
	}

	/* A 4-unit hop with a smaller second bounce, in the last second of the cycle. */
	@keyframes hop {
		0%,
		84%,
		92%,
		100% {
			transform: translateY(0);
		}
		88% {
			transform: translateY(-4px);
		}
		95% {
			transform: translateY(-1.5px);
		}
	}

	/* Two quick wing lifts during the hop. */
	@keyframes flutter {
		0%,
		84%,
		93%,
		100% {
			transform: rotate(0deg);
		}
		86% {
			transform: rotate(16deg);
		}
		88% {
			transform: rotate(3deg);
		}
		90% {
			transform: rotate(14deg);
		}
	}
</style>
