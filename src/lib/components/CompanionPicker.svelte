<script lang="ts">
	import { t } from '$lib/i18n';
	import { KIDS_AGES, type Companion, type KidsAge } from '$lib/profile';
	import User from '@lucide/svelte/icons/user';
	import Users from '@lucide/svelte/icons/users';
	import Baby from '@lucide/svelte/icons/baby';

	let {
		companions = [],
		kids = [],
		onchange
	}: {
		companions?: Companion[];
		kids?: KidsAge[];
		onchange: (next: { companions: Companion[]; kids: KidsAge[] }) => void;
	} = $props();

	const options: Array<{ id: Companion; icon: typeof User }> = [
		{ id: 'alone', icon: User },
		{ id: 'friends', icon: Users },
		{ id: 'family', icon: Baby }
	];

	function toggle(id: Companion) {
		const next = companions.includes(id) ? companions.filter((c) => c !== id) : [...companions, id];
		onchange({ companions: next, kids: next.includes('family') ? kids : [] });
	}

	function toggleKid(age: KidsAge) {
		const next = kids.includes(age) ? kids.filter((k) => k !== age) : [...kids, age];
		onchange({ companions, kids: next });
	}
</script>

<div class="options" role="group" aria-label={t('onboarding.companionTitle')}>
	{#each options as option (option.id)}
		<button type="button" class="option" aria-pressed={companions.includes(option.id)} onclick={() => toggle(option.id)}>
			<option.icon size={26} aria-hidden="true" />
			<span>{t(`companion.${option.id}`)}</span>
		</button>
	{/each}
</div>

{#if companions.includes('family')}
	<div class="kids">
		<p class="label">{t('onboarding.kidsAges')}</p>
		<div class="chip-grid" role="group" aria-label={t('onboarding.kidsAges')}>
			{#each KIDS_AGES as age (age)}
				<button type="button" class="chip" aria-pressed={kids.includes(age)} onclick={() => toggleKid(age)}>{t(`age.${age}`)}</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.options {
		display: grid;
		gap: 10px;
	}

	.option {
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 64px;
		padding: 12px 18px;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-button);
		background: var(--color-surface);
		font-size: 1.25rem;
		font-weight: 800;
		text-align: left;
		-webkit-tap-highlight-color: transparent;
		transition: transform var(--motion-fast) var(--ease-out);
	}

	.option:active {
		transform: scale(0.98);
	}

	.option[aria-pressed='true'] {
		background: var(--color-text);
		border-color: var(--color-text);
		color: var(--color-surface);
	}

	.kids {
		margin-top: 18px;
		display: grid;
		gap: 10px;
	}

	.label {
		font-weight: 800;
	}
</style>
