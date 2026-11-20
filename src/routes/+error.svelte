<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import Mascot from '$lib/components/Mascot.svelte';
	import { t } from '$lib/i18n';
</script>

<div class="page stack error">
	<Mascot size={84} />
	<h1>{page.status === 404 ? t('error.notFound') : t('error.generic')}</h1>
	<a class="btn btn-primary" href={`${base}/`}>{t('event.backHome')}</a>
</div>

<style>
	.error {
		align-items: flex-start;
		padding-top: 32px;
	}
</style>
