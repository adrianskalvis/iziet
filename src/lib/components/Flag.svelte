<script lang="ts">
	import { t } from '$lib/i18n';

	/** Width in px; the Latvian flag is 1:2 (height:width). */
	let { width = 38 }: { width?: number } = $props();
</script>

<!-- Latvian flag: carmine, white, carmine stripes in 2:1:2, proportions 1:2 (State Flag Law). -->
<svg class="flag" {width} height={width / 2} viewBox="0 0 40 20" role="img" aria-label={t('nav.flag')}>
	<rect x="0.5" y="0.5" width="39" height="19" rx="2.5" fill="var(--color-flag-red)" />
	<rect x="0.5" y="8" width="39" height="4" fill="var(--color-flag-white)" />
	<rect x="0.5" y="0.5" width="39" height="19" rx="2.5" fill="none" stroke="var(--color-border)" stroke-width="1" />
</svg>

<style>
	.flag {
		display: block;
		filter: drop-shadow(0 1px 1px rgb(16 24 36 / 0.15));
	}
</style>
