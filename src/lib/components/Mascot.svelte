<script lang="ts">
	import { t } from '$lib/i18n';

	let { size = 80, decorative = false }: { size?: number; decorative?: boolean } = $props();
</script>

<!--
	Cielaviņa: an original cartoon of the white wagtail (baltā cielava), Latvia's national bird.
	Round white face, black crown and bib, grey back, white belly, long black tail that bobs.
	Keep the drawing in sync with BIRD in scripts/build-icons.ts.
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
	<g class="tail"><path d="M43 63 L6 89 Q3 91 6 93 L46 69 Z" fill="#101824" stroke="#101824" stroke-width="2" stroke-linejoin="round" /><path d="M9 91 L43 68.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" /></g>
	<path d="M60 69 L57 92 M69 67 L72 92 M53 92 H60 M68 92 H75" stroke="#3a3f45" stroke-width="2.2" stroke-linecap="round" />
	<ellipse cx="62" cy="58" rx="27" ry="13" transform="rotate(-22 62 58)" fill="#fff" stroke="#101824" stroke-width="2" />
	<path d="M37 68 Q47 47 70 44 Q80 42.5 85 46 Q71 54 56 59 Q45 63 37 68 Z" fill="#a3abb2" stroke="#101824" stroke-width="2" stroke-linejoin="round" />
	<path d="M41 66 Q55 51 77 49.5 Q66 59.5 50 64 Q45 65.5 41 66 Z" fill="#4d555c" stroke="#101824" stroke-width="1.8" stroke-linejoin="round" />
	<path d="M47 63 Q58 56 70 53 M52 64 Q61 59.5 69 57.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none" />
	<path d="M78 38 Q89 43 99 37 Q101 48 91 54 Q81 55 76 47 Z" fill="#101824" />
	<circle cx="88" cy="32" r="12" fill="#fff" stroke="#101824" stroke-width="2" />
	<path d="M77 37.5 A12 12 0 0 1 95.5 22.6 Q90 25.8 85.5 27 Q79.5 29.8 77 37.5 Z" fill="#101824" stroke="#101824" stroke-width="1.5" stroke-linejoin="round" />
	<circle cx="92" cy="31" r="2.6" fill="#101824" />
	<circle cx="93" cy="30" r="0.85" fill="#fff" />
	<ellipse cx="91.5" cy="37" rx="2.6" ry="1.4" fill="#f2a7b1" opacity="0.85" />
	<path d="M99.5 30.5 L111 32 L99.5 33.8 Z" fill="#101824" stroke="#101824" stroke-width="1.1" stroke-linejoin="round" />
</svg>

<style>
	.mascot {
		display: block;
		overflow: visible;
	}

	.tail {
		transform-origin: 44px 66px;
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
