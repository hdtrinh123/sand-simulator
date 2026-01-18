<script lang="ts">
	import '../app.css';
	import GameCanvas from '$lib/components/GameCanvas.svelte';
	import ElementPalette from '$lib/components/ElementPalette.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import type { ParticleType } from '$lib/simulation/particles';
	import { onMount } from 'svelte';

	let selectedElement: ParticleType = $state('sand');
	let brushSize = $state(3);
	let paused = $state(false);
	let gameCanvas: GameCanvas;

	function handleElementSelect(element: ParticleType): void {
		selectedElement = element;
	}

	function handleBrushSizeChange(size: number): void {
		brushSize = size;
	}

	function handlePauseToggle(): void {
		paused = !paused;
	}

	function handleClear(): void {
		gameCanvas?.clear();
	}

	onMount(() => {
		// Keyboard shortcuts
		function handleKeydown(e: KeyboardEvent): void {
			// Don't trigger shortcuts when typing in inputs
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (e.code) {
				case 'Space':
					e.preventDefault();
					handlePauseToggle();
					break;
				case 'KeyC':
					handleClear();
					break;
				case 'Digit1':
					selectedElement = 'sand';
					break;
				case 'Digit2':
					selectedElement = 'water';
					break;
				case 'Digit3':
					selectedElement = 'stone';
					break;
				case 'Digit4':
					selectedElement = 'fire';
					break;
				case 'Digit5':
					selectedElement = 'wood';
					break;
				case 'Digit6':
					selectedElement = 'smoke';
					break;
				case 'Digit7':
					selectedElement = 'oil';
					break;
				case 'Digit8':
					selectedElement = 'acid';
					break;
				case 'Digit0':
					selectedElement = 'empty';
					break;
				case 'BracketLeft':
					brushSize = Math.max(1, brushSize - 1);
					break;
				case 'BracketRight':
					brushSize = Math.min(20, brushSize + 1);
					break;
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<svelte:head>
	<title>Sand Simulator</title>
	<meta name="description" content="A falling sand particle simulator" />
</svelte:head>

<div class="app">
	<aside class="sidebar">
		<h1 class="title">Sand Simulator</h1>
		<ElementPalette selected={selectedElement} onSelect={handleElementSelect} />
		<div class="shortcuts">
			<h3>Shortcuts</h3>
			<ul>
				<li><kbd>1-8</kbd> Select element</li>
				<li><kbd>0</kbd> Eraser</li>
				<li><kbd>Space</kbd> Pause/Play</li>
				<li><kbd>C</kbd> Clear</li>
				<li><kbd>[ ]</kbd> Brush size</li>
			</ul>
		</div>
	</aside>

	<main class="main">
		<Toolbar
			{brushSize}
			{paused}
			onBrushSizeChange={handleBrushSizeChange}
			onPauseToggle={handlePauseToggle}
			onClear={handleClear}
		/>
		<div class="canvas-container">
			<GameCanvas
				bind:this={gameCanvas}
				width={400}
				height={300}
				scale={2}
				{selectedElement}
				{brushSize}
				{paused}
			/>
		</div>
	</main>
</div>

<style>
	.app {
		display: flex;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		background: var(--bg-primary);
		border-right: 1px solid var(--bg-tertiary);
		overflow-y: auto;
	}

	.title {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.shortcuts {
		margin-top: auto;
		padding: 12px;
		background: var(--bg-secondary);
		border-radius: 8px;
		font-size: 12px;
	}

	.shortcuts h3 {
		margin: 0 0 8px 0;
		font-size: 11px;
		text-transform: uppercase;
		color: var(--text-secondary);
		letter-spacing: 0.5px;
	}

	.shortcuts ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.shortcuts li {
		display: flex;
		gap: 8px;
		color: var(--text-secondary);
	}

	.shortcuts kbd {
		background: var(--bg-tertiary);
		padding: 2px 6px;
		border-radius: 3px;
		font-family: inherit;
		font-size: 11px;
		color: var(--text-primary);
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		overflow: hidden;
	}

	.canvas-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-secondary);
		border-radius: 8px;
		overflow: hidden;
	}

	:global(.game-canvas) {
		max-width: 100%;
		max-height: 100%;
	}
</style>
