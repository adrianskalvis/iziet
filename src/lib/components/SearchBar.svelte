<script lang="ts" module>
	export type Scope = 'nearby' | 'all';
</script>

<script lang="ts">
	import { t } from '$lib/i18n';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';

	let {
		value = $bindable(''),
		scope = $bindable<Scope>('nearby'),
		autofocus = false,
		oninput,
		onsubmit
	}: {
		value?: string;
		scope?: Scope;
		autofocus?: boolean;
		oninput?: (value: string, scope: Scope) => void;
		onsubmit?: (value: string, scope: Scope) => void;
	} = $props();

	let input = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (autofocus) input?.focus();
	});

	function setScope(next: Scope) {
		scope = next;
		oninput?.(value, scope);
	}
</script>

<form
	class="search"
	role="search"
	onsubmit={(e) => {
		e.preventDefault();
		input?.blur();
		onsubmit?.(value, scope);
	}}
>
	<label class="field">
		<span class="visually-hidden">{t('search.label')}</span>
		<Search size={22} aria-hidden="true" />
		<input
			bind:this={input}
			bind:value
			type="search"
			enterkeyhint="search"
			autocomplete="off"
			spellcheck="false"
			placeholder={t('search.placeholder')}
			oninput={() => oninput?.(value, scope)}
		/>
		{#if value}
			<button
				type="button"
				class="clear"
				aria-label={t('search.clear')}
				onclick={() => {
					value = '';
					oninput?.('', scope);
					input?.focus();
				}}
			>
				<X size={20} aria-hidden="true" />
			</button>
		{/if}
	</label>

	<div class="scope" role="radiogroup" aria-label={t('search.scope')}>
		<button type="button" role="radio" aria-checked={scope === 'nearby'} class="chip" onclick={() => setScope('nearby')}>
			{t('search.nearby')}
		</button>
		<button type="button" role="radio" aria-checked={scope === 'all'} class="chip" onclick={() => setScope('all')}>
			{t('search.all')}
		</button>
	</div>
</form>

<style>
	.search {
		display: grid;
		gap: 10px;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 56px;
		padding: 0 6px 0 16px;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-button);
		background: var(--color-surface);
		box-shadow: var(--shadow-card);
	}

	.field:focus-within {
		outline: var(--focus-ring);
		outline-offset: var(--focus-offset);
	}

	.field :global(svg) {
		flex: none;
		color: var(--color-text-muted);
	}

	input {
		flex: 1;
		min-width: 0;
		height: 52px;
		border: 0;
		background: transparent;
		font-size: var(--text-body);
		outline: none;
	}

	input::placeholder {
		color: var(--color-text-muted);
		opacity: 1;
	}

	input::-webkit-search-cancel-button {
		display: none;
	}

	.clear {
		display: grid;
		place-items: center;
		width: var(--tap-min);
		height: var(--tap-min);
		border: 0;
		border-radius: 12px;
		background: transparent;
	}

	.scope {
		display: flex;
		gap: 8px;
	}

	.scope .chip {
		flex: 1;
		justify-content: center;
	}
</style>
