<script lang="ts">
	import { t } from '$lib/i18n';

	let { size = 120, decorative = false }: { size?: number; decorative?: boolean } = $props();
</script>

<!--
	Cielaviņa: an original cartoon of the white wagtail (baltā cielava), Latvia's national bird.
	Black cap and bib, white face, grey back, long tail that bobs.
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
	<g class="tail">
		<path d="M34 60 L6 46 Q2 44 6 42 L38 52 Z" fill="#101824" stroke="#101824" stroke-width="2" stroke-linejoin="round" />
		<path d="M9 44 L33 54" stroke="#fff" stroke-width="2" stroke-linecap="round" />
	</g>
	<path d="M54 82 L51 94 M63 82 L65 94" stroke="#101824" stroke-width="2.6" stroke-linecap="round" />
	<path d="M47 94 H55 M61 94 H69" stroke="#101824" stroke-width="2.6" stroke-linecap="round" />
	<ellipse cx="57" cy="64" rx="30" ry="19" fill="#9aa2a9" stroke="#101824" stroke-width="2" />
	<path d="M38 68 Q56 90 82 70 Q80 58 68 56 Q50 58 38 68 Z" fill="#fff" stroke="#101824" stroke-width="2" stroke-linejoin="round" />
	<path d="M41 61 Q55 50 69 61 Q56 69 41 61 Z" fill="#5e666d" stroke="#101824" stroke-width="2" stroke-linejoin="round" />
	<path d="M47 61 Q55 57 63 61" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" />
	<path d="M70 48 Q86 49 88 61 Q79 67 69 60 Z" fill="#101824" />
	<circle cx="83" cy="37" r="18" fill="#fff" stroke="#101824" stroke-width="2" />
	<path d="M66 33 Q69 17 86 19 Q100 21 100 32 Q89 26 77 29 Q70 31 66 33 Z" fill="#101824" />
	<circle cx="89" cy="37" r="3.6" fill="#101824" />
	<circle cx="90.3" cy="35.7" r="1.2" fill="#fff" />
	<ellipse cx="85" cy="45.5" rx="3.6" ry="2" fill="#f2a7b1" opacity="0.85" />
	<path d="M99.5 39 L109 41.5 L99.5 44 Z" fill="#101824" stroke="#101824" stroke-width="1.5" stroke-linejoin="round" />
</svg>

<style>
	.mascot {
		display: block;
		overflow: visible;
	}

	.tail {
		transform-origin: 36px 56px;
	}

	@media (prefers-reduced-motion: no-preference) {
		.tail {
			animation: wag 2.4s ease-in-out infinite;
		}
	}

	@keyframes wag {
		0%,
		70%,
		100% {
			transform: rotate(0deg);
		}
		78% {
			transform: rotate(-12deg);
		}
		86% {
			transform: rotate(4deg);
		}
	}
</style>
