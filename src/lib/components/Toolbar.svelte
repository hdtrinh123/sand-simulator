<script lang="ts">
	interface Props {
		brushSize?: number;
		paused?: boolean;
		onBrushSizeChange?: (size: number) => void;
		onPauseToggle?: () => void;
		onClear?: () => void;
	}

	let {
		brushSize = 3,
		paused = false,
		onBrushSizeChange,
		onPauseToggle,
		onClear
	}: Props = $props();

	function handleBrushChange(e: Event): void {
		const target = e.target as HTMLInputElement;
		onBrushSizeChange?.(parseInt(target.value, 10));
	}
</script>

<div class="toolbar">
	<div class="toolbar-section">
		<label class="brush-control">
			<span class="label">Brush: {brushSize}</span>
			<input
				type="range"
				min="1"
				max="20"
				value={brushSize}
				oninput={handleBrushChange}
				class="brush-slider"
			/>
		</label>
	</div>

	<div class="toolbar-section buttons">
		<button
			class="toolbar-btn"
			class:active={paused}
			onclick={onPauseToggle}
			title={paused ? 'Resume (Space)' : 'Pause (Space)'}
		>
			{paused ? '▶ Play' : '⏸ Pause'}
		</button>

		<button
			class="toolbar-btn danger"
			onclick={onClear}
			title="Clear canvas (C)"
		>
			🗑 Clear
		</button>
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 12px 16px;
		background: var(--bg-secondary);
		border-radius: 8px;
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.brush-control {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.label {
		font-size: 13px;
		color: var(--text-secondary);
		min-width: 70px;
	}

	.brush-slider {
		width: 120px;
		height: 6px;
		border-radius: 3px;
		background: var(--bg-tertiary);
		appearance: none;
		cursor: pointer;
	}

	.brush-slider::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--accent);
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	.brush-slider::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}

	.brush-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border: none;
		border-radius: 50%;
		background: var(--accent);
		cursor: pointer;
	}

	.buttons {
		gap: 8px;
	}

	.toolbar-btn {
		padding: 8px 16px;
		background: var(--bg-tertiary);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 13px;
		transition: all 0.15s ease;
	}

	.toolbar-btn:hover {
		background: var(--accent);
	}

	.toolbar-btn.active {
		background: var(--accent);
	}

	.toolbar-btn.danger:hover {
		background: #c0392b;
	}
</style>
