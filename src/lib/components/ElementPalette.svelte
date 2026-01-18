<script lang="ts">
	import { particleList, type ParticleType } from '../simulation/particles';

	interface Props {
		selected?: ParticleType;
		onSelect?: (element: ParticleType) => void;
	}

	let { selected = 'sand', onSelect }: Props = $props();

	function colorToHex(color: number): string {
		return '#' + color.toString(16).padStart(6, '0');
	}

	function handleSelect(type: ParticleType): void {
		onSelect?.(type);
	}

	function handleKeydown(e: KeyboardEvent, type: ParticleType): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleSelect(type);
		}
	}

	// Group particles by category
	const categories = {
		powder: particleList.filter(p => p.category === 'powder'),
		liquid: particleList.filter(p => p.category === 'liquid'),
		solid: particleList.filter(p => p.category === 'solid'),
		gas: particleList.filter(p => p.category === 'gas'),
		special: particleList.filter(p => p.category === 'special')
	};

	const categoryLabels: Record<string, string> = {
		powder: 'Powders',
		liquid: 'Liquids',
		solid: 'Solids',
		gas: 'Gases',
		special: 'Special'
	};
</script>

<div class="palette">
	<!-- Eraser first -->
	<div class="category">
		<div class="category-label">Tools</div>
		<div class="elements">
			<button
				class="element-btn eraser"
				class:selected={selected === 'empty'}
				onclick={() => handleSelect('empty')}
				onkeydown={(e) => handleKeydown(e, 'empty')}
				title="Eraser"
			>
				<span class="element-icon">✕</span>
				<span class="element-name">Eraser</span>
			</button>
		</div>
	</div>

	{#each Object.entries(categories) as [category, particles]}
		{#if particles.length > 0}
			<div class="category">
				<div class="category-label">{categoryLabels[category]}</div>
				<div class="elements">
					{#each particles as particle}
						<button
							class="element-btn"
							class:selected={selected === particle.id}
							style="--element-color: {colorToHex(particle.baseColor)}"
							onclick={() => handleSelect(particle.id)}
							onkeydown={(e) => handleKeydown(e, particle.id)}
							title={particle.name}
						>
							<span class="element-swatch"></span>
							<span class="element-name">{particle.name}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.palette {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px;
		background: var(--bg-secondary);
		border-radius: 8px;
		min-width: 140px;
	}

	.category {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.category-label {
		font-size: 11px;
		text-transform: uppercase;
		color: var(--text-secondary);
		letter-spacing: 0.5px;
	}

	.elements {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.element-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		background: var(--bg-tertiary);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 13px;
		transition: all 0.15s ease;
	}

	.element-btn:hover {
		background: var(--accent);
		transform: translateX(2px);
	}

	.element-btn.selected {
		background: var(--accent);
		box-shadow: 0 0 0 2px rgba(233, 69, 96, 0.4);
	}

	.element-swatch {
		width: 16px;
		height: 16px;
		border-radius: 3px;
		background: var(--element-color);
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
	}

	.element-icon {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
	}

	.eraser .element-icon {
		color: #ff6b6b;
	}

	.element-name {
		flex: 1;
	}
</style>
