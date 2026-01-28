<script lang="ts">
	import '../app.css';
	import GameCanvas from '$lib/components/GameCanvas.svelte';
	import ElementPalette from '$lib/components/ElementPalette.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import type { ParticleType } from '$lib/simulation/particles';
	import type { CameraMode } from '$lib/rendering/ThreeRenderer';
	import type { PerformanceStats } from '$lib/simulation/Engine';
	import { onMount } from 'svelte';

	let selectedElement: ParticleType = $state('sand');
	let brushSize = $state(2);
	let paused = $state(false);
	let cameraMode: CameraMode = $state('orbit');
	let showStats = $state(true);
	let stats: PerformanceStats | null = $state(null);
	let gameCanvas: GameCanvas;
	let statsInterval: ReturnType<typeof setInterval>;

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

	function handleGenerateWorld(): void {
		gameCanvas?.generateWorld();
	}

	function handleResetCamera(): void {
		gameCanvas?.resetCamera();
	}

	function handleModeToggle(): void {
		const newMode = gameCanvas?.toggleCameraMode();
		if (newMode) {
			cameraMode = newMode;
		}
	}

	function handleModeChange(mode: CameraMode): void {
		cameraMode = mode;
	}

	onMount(() => {
		function handleKeydown(e: KeyboardEvent): void {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			// In first-person mode, handle F key for mode switching and number keys for elements
			if (cameraMode === 'firstperson') {
				switch (e.code) {
					case 'KeyF':
						e.preventDefault();
						handleModeToggle();
						return;
					case 'KeyG':
						handleGenerateWorld();
						return;
					case 'Digit1':
						selectedElement = 'sand';
						return;
					case 'Digit2':
						selectedElement = 'dirt';
						return;
					case 'Digit3':
						selectedElement = 'water';
						return;
					case 'Digit4':
						selectedElement = 'stone';
						return;
					case 'Digit5':
						selectedElement = 'fire';
						return;
					case 'Digit6':
						selectedElement = 'wood';
						return;
					case 'Digit7':
						selectedElement = 'smoke';
						return;
					case 'Digit8':
						selectedElement = 'oil';
						return;
					case 'Digit9':
						selectedElement = 'acid';
						return;
					case 'Digit0':
						selectedElement = 'empty';
						return;
					case 'BracketLeft':
						brushSize = Math.max(1, brushSize - 1);
						return;
					case 'BracketRight':
						brushSize = Math.min(10, brushSize + 1);
						return;
				}
				// Don't intercept movement keys in first-person mode
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
				case 'KeyG':
					handleGenerateWorld();
					break;
				case 'KeyR':
					handleResetCamera();
					break;
				case 'KeyF':
					handleModeToggle();
					break;
				case 'Digit1':
					selectedElement = 'sand';
					break;
				case 'Digit2':
					selectedElement = 'dirt';
					break;
				case 'Digit3':
					selectedElement = 'water';
					break;
				case 'Digit4':
					selectedElement = 'stone';
					break;
				case 'Digit5':
					selectedElement = 'fire';
					break;
				case 'Digit6':
					selectedElement = 'wood';
					break;
				case 'Digit7':
					selectedElement = 'smoke';
					break;
				case 'Digit8':
					selectedElement = 'oil';
					break;
				case 'Digit9':
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

		// Update stats every 200ms
		statsInterval = setInterval(() => {
			if (gameCanvas) {
				stats = gameCanvas.getStats();
			}
		}, 200);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			clearInterval(statsInterval);
		};
	});

	function toggleStats(): void {
		showStats = !showStats;
	}
</script>

<svelte:head>
	<title>3D Sand Simulator</title>
	<meta name="description" content="A 3D falling sand particle simulator" />
</svelte:head>

<div class="app">
	<aside class="sidebar" class:hidden={cameraMode === 'firstperson'}>
		<h1 class="title">3D Sand Simulator</h1>
		<ElementPalette selected={selectedElement} onSelect={handleElementSelect} />
		<div class="shortcuts">
			<h3>Shortcuts</h3>
			<ul>
				<li><kbd>1-9</kbd> Select element</li>
				<li><kbd>0</kbd> Eraser</li>
				<li><kbd>Space</kbd> Pause/Play</li>
				<li><kbd>C</kbd> Clear</li>
				<li><kbd>G</kbd> Generate world</li>
				<li><kbd>R</kbd> Reset camera</li>
				<li><kbd>F</kbd> Toggle view</li>
				<li><kbd>[ ]</kbd> Brush size</li>
			</ul>
			<h3>Camera</h3>
			<ul>
				<li><kbd>Drag</kbd> Rotate</li>
				<li><kbd>Scroll</kbd> Zoom</li>
				<li><kbd>Right-drag</kbd> Pan</li>
			</ul>
			<h3>First Person</h3>
			<ul>
				<li><kbd>WASD</kbd> Move</li>
				<li><kbd>Space</kbd> Jump</li>
				<li><kbd>1-9</kbd> Elements</li>
				<li><kbd>Mouse</kbd> Look</li>
				<li><kbd>Click</kbd> Place</li>
				<li><kbd>ESC</kbd> Exit</li>
			</ul>
		</div>
	</aside>

	<main class="main">
		<Toolbar
			{brushSize}
			{paused}
			{cameraMode}
			onBrushSizeChange={handleBrushSizeChange}
			onPauseToggle={handlePauseToggle}
			onClear={handleClear}
			onModeToggle={handleModeToggle}
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
				{cameraMode}
				onModeChange={handleModeChange}
			/>
			{#if showStats && stats}
				<div class="stats-panel">
					<button class="stats-toggle" onclick={toggleStats}>x</button>
					<div class="stats-header">Performance</div>
					<div class="stats-row">
						<span class="stats-label">FPS:</span>
						<span class="stats-value" class:warning={stats.fps < 30} class:critical={stats.fps < 15}>{stats.fps}</span>
					</div>
					<div class="stats-divider"></div>
					<div class="stats-row">
						<span class="stats-label">Sim (CPU):</span>
						<span class="stats-value" class:warning={stats.simulationMs > 10} class:critical={stats.simulationMs > 20}>{stats.simulationMs} ms</span>
					</div>
					<div class="stats-row">
						<span class="stats-label">Render (GPU):</span>
						<span class="stats-value" class:warning={stats.renderMs > 10} class:critical={stats.renderMs > 20}>{stats.renderMs} ms</span>
					</div>
					<div class="stats-divider"></div>
					<div class="stats-row">
						<span class="stats-label">Awake:</span>
						<span class="stats-value" class:warning={stats.awakeParticles > 10000} class:critical={stats.awakeParticles > 30000}>{stats.awakeParticles.toLocaleString()}</span>
					</div>
					<div class="stats-row">
						<span class="stats-label">Visible:</span>
						<span class="stats-value">{stats.visibleParticles.toLocaleString()}</span>
					</div>
					<div class="stats-row">
						<span class="stats-label">Total:</span>
						<span class="stats-value">{stats.totalParticles.toLocaleString()}</span>
					</div>
					<div class="stats-note">
						{#if stats.simulationMs > stats.renderMs * 2}
							CPU-bound (simulation)
						{:else if stats.renderMs > stats.simulationMs * 2}
							GPU-bound (rendering)
						{:else}
							Balanced
						{/if}
					</div>
				</div>
			{:else if !showStats}
				<button class="stats-toggle-show" onclick={toggleStats}>Stats</button>
			{/if}
			{#if cameraMode === 'firstperson'}
				<div class="crosshair">
					<div class="crosshair-h"></div>
					<div class="crosshair-v"></div>
				</div>
				<div class="fp-hud">
					<div class="element-indicator" style="background-color: {getElementColor(selectedElement)}">
						{selectedElement === 'empty' ? 'Eraser' : selectedElement}
					</div>
					<div class="controls-hint">
						WASD move | Space jump | 1-9 elements | Click place | ESC exit
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>

<script context="module" lang="ts">
	function getElementColor(element: ParticleType): string {
		const colors: Record<ParticleType, string> = {
			empty: '#ff6b6b',
			sand: '#c2b280',
			dirt: '#8b4513',
			grass: '#228b22',
			water: '#4a90d9',
			stone: '#808080',
			fire: '#ff4500',
			wood: '#a0522d',
			smoke: '#555555',
			oil: '#3d2914',
			acid: '#7fff00'
		};
		return colors[element] || '#888888';
	}
</script>

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
		transition: transform 0.3s ease, opacity 0.3s ease;
	}

	.sidebar.hidden {
		transform: translateX(-100%);
		position: absolute;
		opacity: 0;
		pointer-events: none;
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
		position: relative;
	}

	/* Crosshair for first-person mode */
	.crosshair {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
		z-index: 100;
	}

	.crosshair-h,
	.crosshair-v {
		position: absolute;
		background: rgba(255, 255, 255, 0.8);
		box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
	}

	.crosshair-h {
		width: 20px;
		height: 2px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.crosshair-v {
		width: 2px;
		height: 20px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	/* First-person HUD */
	.fp-hud {
		position: absolute;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		pointer-events: none;
		z-index: 100;
	}

	.element-indicator {
		padding: 8px 16px;
		border-radius: 6px;
		color: white;
		font-size: 14px;
		font-weight: 600;
		text-transform: capitalize;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	.controls-hint {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	/* Performance stats panel */
	.stats-panel {
		position: absolute;
		top: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		padding: 10px 12px;
		font-family: monospace;
		font-size: 11px;
		color: #ccc;
		z-index: 100;
		min-width: 150px;
	}

	.stats-header {
		font-weight: bold;
		color: #fff;
		margin-bottom: 8px;
		font-size: 12px;
	}

	.stats-row {
		display: flex;
		justify-content: space-between;
		margin: 3px 0;
	}

	.stats-label {
		color: #888;
	}

	.stats-value {
		color: #4ade80;
		font-weight: bold;
	}

	.stats-value.warning {
		color: #fbbf24;
	}

	.stats-value.critical {
		color: #ef4444;
	}

	.stats-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 6px 0;
	}

	.stats-note {
		margin-top: 8px;
		padding-top: 6px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		color: #888;
		font-size: 10px;
		text-align: center;
	}

	.stats-toggle {
		position: absolute;
		top: 4px;
		right: 4px;
		background: transparent;
		border: none;
		color: #666;
		cursor: pointer;
		font-size: 12px;
		padding: 2px 6px;
	}

	.stats-toggle:hover {
		color: #fff;
	}

	.stats-toggle-show {
		position: absolute;
		top: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: #888;
		cursor: pointer;
		font-size: 11px;
		padding: 4px 8px;
		z-index: 100;
	}

	.stats-toggle-show:hover {
		background: rgba(0, 0, 0, 0.8);
		color: #fff;
	}
</style>
