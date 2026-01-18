<script lang="ts">
	import '../app.css';
	import GameCanvas from '$lib/components/GameCanvas.svelte';
	import ElementPalette from '$lib/components/ElementPalette.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import type { ParticleType } from '$lib/simulation/particles';
	import { onMount } from 'svelte';

	let selectedElement: ParticleType = $state('sand');
	let brushSize = $state(2);
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

	function handleResetCamera(): void {
		gameCanvas?.resetCamera();
	}

	onMount(() => {
		function handleKeydown(e: KeyboardEvent): void {
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
				case 'KeyR':
					handleResetCamera();
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
					brushSize = Math.min(10, brushSize + 1);
					break;
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<svelte:head>
	<title>3D Sand Simulator</title>
	<meta name="description" content="A 3D falling sand particle simulator" />
</svelte:head>

<div class="app">
	<aside class="sidebar">
		<h1 class="title">3D Sand Simulator</h1>
		<ElementPalette selected={selectedElement} onSelect={handleElementSelect} />
		<div class="shortcuts">
			<h3>Shortcuts</h3>
			<ul>
				<li><kbd>1-8</kbd> Select element</li>
				<li><kbd>0</kbd> Eraser</li>
				<li><kbd>Space</kbd> Pause/Play</li>
				<li><kbd>C</kbd> Clear</li>
				<li><kbd>R</kbd> Reset camera</li>
				<li><kbd>[ ]</kbd> Brush size</li>
			</ul>
			<h3>Camera</h3>
			<ul>
				<li><kbd>Drag</kbd> Rotate</li>
				<li><kbd>Scroll</kbd> Zoom</li>
				<li><kbd>Right-drag</kbd> Pan</li>
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
				width={64}
				height={64}
				depth={64}
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
		min-width: 160px;
	}

	.title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.shortcuts {
		margin-top: auto;
		padding: 12px;
		background: var(--bg-secondary);
		border-radius: 8px;
		font-size: 11px;
	}

	.shortcuts h3 {
		margin: 0 0 8px 0;
		font-size: 10px;
		text-transform: uppercase;
		color: var(--text-secondary);
		letter-spacing: 0.5px;
	}

	.shortcuts h3:not(:first-child) {
		margin-top: 12px;
	}

	.shortcuts ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.shortcuts li {
		display: flex;
		gap: 6px;
		color: var(--text-secondary);
		font-size: 10px;
	}

	.shortcuts kbd {
		background: var(--bg-tertiary);
		padding: 1px 4px;
		border-radius: 2px;
		font-family: inherit;
		font-size: 9px;
		color: var(--text-primary);
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px;
		overflow: hidden;
	}

	.canvas-container {
		flex: 1;
		display: flex;
		align-items: stretch;
		justify-content: stretch;
		background: var(--bg-secondary);
		border-radius: 8px;
		overflow: hidden;
	}
</style>
