<script lang="ts">
	import { t } from '$lib/i18n';

	/** Width in px; the map is 46:29. */
	let { width = 44 }: { width?: number } = $props();

	/**
	 * Outline of Latvia, simplified to 58 points from Natural Earth 1:50m
	 * (public domain), longitude scaled by cos 57° so the shape is not stretched.
	 */
	const LATVIA =
		'M35.2 27.9 L33.2 27.0 L32.0 25.4 L29.5 23.0 L25.8 21.9 L24.8 19.7 L24.4 19.6 L22.2 21.0 L20.0 21.2 L18.1 20.5 L14.4 20.1 L13.4 20.6 L12.4 19.7 L10.6 20.0 L7.5 19.6 L4.9 20.7 L1.2 23.4 L1.0 21.3 L1.3 14.9 L3.1 12.8 L3.7 9.3 L5.4 6.5 L10.4 4.8 L11.0 6.3 L14.0 9.3 L14.9 11.9 L17.1 13.3 L18.9 12.9 L21.6 10.1 L21.2 3.2 L26.1 1.0 L26.8 1.8 L27.1 1.2 L27.5 1.3 L30.3 3.2 L31.5 3.5 L33.3 6.2 L34.3 6.8 L34.8 7.0 L37.4 6.1 L38.8 6.9 L40.5 7.1 L40.9 8.1 L42.7 9.7 L42.7 10.8 L41.6 14.7 L42.8 14.6 L43.8 17.5 L44.4 18.1 L45.0 21.3 L44.7 22.6 L43.1 23.3 L41.6 25.2 L41.2 26.5 L38.0 26.1 L37.4 26.3 L36.6 27.5 Z';
</script>

<!-- Map of Latvia filled with the flag: carmine, white, carmine stripes in 2:1:2. -->
<svg class="flag" {width} height={width * (29 / 46)} viewBox="0 0 46 29" role="img" aria-label={t('nav.flag')}>
	<defs>
		<clipPath id="flag-latvia"><path d={LATVIA} /></clipPath>
	</defs>
	<g clip-path="url(#flag-latvia)">
		<rect width="46" height="29" fill="var(--color-flag-red)" />
		<rect y="11.8" width="46" height="5.4" fill="var(--color-flag-white)" />
	</g>
	<path d={LATVIA} fill="none" stroke="var(--color-flag-red)" stroke-width="0.9" stroke-linejoin="round" />
</svg>

<style>
	.flag {
		display: block;
		filter: drop-shadow(0 1px 1px rgb(16 24 36 / 0.15));
	}
</style>
