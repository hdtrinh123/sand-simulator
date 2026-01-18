<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Engine } from '../simulation/Engine';
	import { ThreeRenderer } from '../rendering/ThreeRenderer';
	import { InputHandler3D } from '../input/InputHandler3D';
	import type { ParticleType } from '../simulation/particles';

	interface Props {
		width?: number;
		height?: number;
		depth?: number;
		selectedElement?: ParticleType;
		brushSize?: number;
		paused?: boolean;
	}

	let {
		width = 64,
		height = 64,
		depth = 64,
		selectedElement = 'sand',
		brushSize = 2,
		paused = false
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let engine: Engine;
	let renderer: ThreeRenderer;
	let inputHandler: InputHandler3D;

	export function getEngine(): Engine {
		return engine;
	}

	export function clear(): void {
		engine?.clear();
	}

	export function resetCamera(): void {
		renderer?.resetCamera();
	}

	onMount(() => {
		engine = new Engine(width, height, depth);
		renderer = new ThreeRenderer(canvas, engine.grid);
		inputHandler = new InputHandler3D(canvas, engine, renderer);

		// Handle resize
		const resizeObserver = new ResizeObserver(() => {
			if (container && renderer) {
				renderer.resize(container.clientWidth, container.clientHeight);
			}
		});
		resizeObserver.observe(container);

		engine.onUpdate = () => {
			renderer.render();
		};

		if (!paused) {
			engine.start();
		}

		// Initial render
		renderer.render();

		return () => {
			resizeObserver.disconnect();
		};
	});

	onDestroy(() => {
		engine?.stop();
		inputHandler?.destroy();
		renderer?.dispose();
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

<div bind:this={container} class="canvas-container">
	<canvas bind:this={canvas} class="game-canvas"></canvas>
</div>

<style>
	.canvas-container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.game-canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
