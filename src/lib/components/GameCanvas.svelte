<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Engine, type PerformanceStats } from '../simulation/Engine';
	import { ThreeRenderer, type CameraMode } from '../rendering/ThreeRenderer';
	import { InputHandler3D } from '../input/InputHandler3D';
	import type { ParticleType } from '../simulation/particles';

	interface Props {
		width?: number;
		height?: number;
		depth?: number;
		selectedElement?: ParticleType;
		brushSize?: number;
		paused?: boolean;
		cameraMode?: CameraMode;
		onModeChange?: (mode: CameraMode) => void;
	}

	let {
		width = 96,
		height = 96,
		depth = 96,
		selectedElement = 'sand',
		brushSize = 2,
		paused = false,
		cameraMode = 'orbit',
		onModeChange
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

	export function generateWorld(): void {
		engine?.generateWorld();
	}

	export function toggleCameraMode(): CameraMode {
		return renderer?.toggleCameraMode() ?? 'orbit';
	}

	export function setCameraMode(mode: CameraMode): void {
		renderer?.setCameraMode(mode);
	}

	export function getStats(): PerformanceStats | null {
		if (!engine || !renderer) return null;
		const stats = engine.getStats();
		stats.renderMs = renderer.getRenderMs();
		return stats;
	}

	onMount(() => {
		engine = new Engine(width, height, depth);
		renderer = new ThreeRenderer(canvas, engine.grid);
		inputHandler = new InputHandler3D(canvas, engine, renderer);

		// Listen for mode changes from the renderer
		renderer.onModeChange = (mode) => {
			onModeChange?.(mode);
		};

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

	$effect(() => {
		if (renderer && renderer.getCameraMode() !== cameraMode) {
			renderer.setCameraMode(cameraMode);
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
