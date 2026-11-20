<script lang="ts">
	import { t } from '$lib/i18n';

	let { size = 32 }: { size?: number } = $props();
</script>

<!-- Latvian flag: carmine-white-carmine 2:1:2, 1:2 proportions, gently waved. -->
<svg class="flag" width={size} height={size * 0.75} viewBox="0 0 40 30" role="img" aria-label={t('nav.flag')}>
	<defs>
		<clipPath id="flag-wave">
			<path d="M4 6 Q12 2 20 6 T36 6 V24 Q28 20 20 24 T4 24 Z" />
		</clipPath>
	</defs>
	<g clip-path="url(#flag-wave)">
		<!-- Visible height runs from y=6 to y=24 (18 units): 7.2 + 3.6 + 7.2 keeps the 2:1:2 ratio. -->
		<rect x="0" y="0" width="40" height="13.2" fill="var(--color-flag-red)" />
		<rect x="0" y="13.2" width="40" height="3.6" fill="var(--color-flag-white)" />
		<rect x="0" y="16.8" width="40" height="13.2" fill="var(--color-flag-red)" />
	</g>
	<path
		d="M4 6 Q12 2 20 6 T36 6 V24 Q28 20 20 24 T4 24 Z"
		fill="none"
		stroke="var(--color-border)"
		stroke-width="1"
		stroke-linejoin="round"
	/>
</svg>

<style>
	.flag {
		display: block;
		transform-origin: left center;
	}

	@media (prefers-reduced-motion: no-preference) {
		.flag {
			animation: flutter 4s ease-in-out infinite;
		}
	}

	@keyframes flutter {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(-3deg);
		}
	}
</style>
