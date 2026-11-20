<script lang="ts">
	let { large = false }: { large?: boolean } = $props();
</script>

<div class="skeleton" class:large aria-hidden="true">
	<div class="img"></div>
	<div class="lines">
		<span class="line short"></span>
		<span class="line"></span>
		<span class="line mid"></span>
	</div>
</div>

<style>
	.skeleton {
		display: grid;
		grid-template-columns: 104px 1fr;
		gap: 14px;
		padding: 10px;
		border-radius: var(--radius-card);
		background: var(--color-surface);
		box-shadow: var(--shadow-card);
	}

	.large {
		grid-template-columns: 1fr;
	}

	.img {
		aspect-ratio: 1;
		border-radius: 12px;
		background: var(--color-border-subtle);
	}

	.large .img {
		aspect-ratio: 3 / 2;
	}

	.lines {
		display: grid;
		gap: 10px;
		align-content: start;
		padding: 6px 0;
	}

	.line {
		height: 14px;
		border-radius: 7px;
		background: var(--color-border-subtle);
	}

	.short {
		width: 40%;
	}

	.mid {
		width: 70%;
	}

	@media (prefers-reduced-motion: no-preference) {
		.img,
		.line {
			animation: pulse 1.4s ease-in-out infinite;
		}
	}

	@keyframes pulse {
		50% {
			opacity: 0.55;
		}
	}
</style>
