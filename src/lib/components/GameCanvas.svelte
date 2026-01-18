<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Engine } from '../simulation/Engine';
	import { CanvasRenderer } from '../rendering/CanvasRenderer';
	import { InputHandler } from '../input/InputHandler';
	import type { ParticleType } from '../simulation/particles';

	interface Props {
		width?: number;
		height?: number;
		scale?: number;
		selectedElement?: ParticleType;
		brushSize?: number;
		paused?: boolean;
	}

	let {
		width = 400,
		height = 300,
		scale = 2,
		selectedElement = 'sand',
		brushSize = 3,
		paused = false
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let engine: Engine;
	let renderer: CanvasRenderer;
	let inputHandler: InputHandler;

	export function getEngine(): Engine {
		return engine;
	}

	export function clear(): void {
		engine?.clear();
	}

	onMount(() => {
		engine = new Engine(width, height);
		renderer = new CanvasRenderer(canvas, engine.grid, scale);
		inputHandler = new InputHandler(canvas, engine, renderer);

		engine.onUpdate = () => {
			renderer.render();
		};

		if (!paused) {
			engine.start();
		}

		// Initial render
		renderer.render();
	});

	onDestroy(() => {
		engine?.stop();
		inputHandler?.destroy();
	});

	$effect(() => {
		if (inputHandler) {
			inputHandler.selectedElement = selectedElement;
		}
	});

	$effect(() => {
		if (inputHandler) {
			inputHandler.brushSize = brushSize;
		}
	});

	$effect(() => {
		if (engine) {
			if (paused) {
				engine.stop();
			} else {
				engine.start();
			}
		}
	});
</script>

<canvas
	bind:this={canvas}
	class="game-canvas"
></canvas>

<style>
	.game-canvas {
		display: block;
		background: var(--bg-primary);
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		cursor: crosshair;
	}
</style>
