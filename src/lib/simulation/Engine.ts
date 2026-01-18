import { Grid } from './Grid';
import { particles, createParticle, type ParticleType } from './particles';

export class Engine {
	grid: Grid;
	private running: boolean = false;
	private animationId: number | null = null;
	private lastTime: number = 0;
	private accumulator: number = 0;
	private readonly fixedDeltaTime: number = 1000 / 60; // 60 updates per second

	onUpdate?: () => void;

	constructor(width: number, height: number) {
		this.grid = new Grid(width, height);
	}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.lastTime = performance.now();
		this.loop();
	}

	stop(): void {
		this.running = false;
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	toggle(): boolean {
		if (this.running) {
			this.stop();
		} else {
			this.start();
		}
		return this.running;
	}

	isRunning(): boolean {
		return this.running;
	}

	private loop = (): void => {
		if (!this.running) return;

		const currentTime = performance.now();
		const deltaTime = currentTime - this.lastTime;
		this.lastTime = currentTime;

		this.accumulator += deltaTime;

		// Process fixed time steps
		while (this.accumulator >= this.fixedDeltaTime) {
			this.update();
			this.accumulator -= this.fixedDeltaTime;
		}

		this.onUpdate?.();
		this.animationId = requestAnimationFrame(this.loop);
	};

	private update(): void {
		this.grid.resetUpdated();

		// Update from bottom to top so falling particles work correctly
		for (let y = this.grid.height - 1; y >= 0; y--) {
			// Randomize x order to prevent directional bias
			const xIndices = this.getRandomizedXOrder();

			for (const x of xIndices) {
				const particle = this.grid.get(x, y);
				if (particle && particle.type !== 'empty') {
					const definition = particles[particle.type];
					if (definition) {
						definition.update(this.grid, x, y);
					}
				}
			}
		}
	}

	private getRandomizedXOrder(): number[] {
		const indices = Array.from({ length: this.grid.width }, (_, i) => i);
		// Fisher-Yates shuffle
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}
		return indices;
	}

	addParticle(x: number, y: number, type: ParticleType): void {
		if (!this.grid.isInBounds(x, y)) return;
		if (type === 'empty') {
			this.grid.set(x, y, null);
			return;
		}

		const definition = particles[type];
		if (definition) {
			const particle = createParticle(type, definition.baseColor, definition.colorVariation);
			this.grid.set(x, y, particle);
		}
	}

	addParticleInRadius(cx: number, cy: number, radius: number, type: ParticleType): void {
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				if (dx * dx + dy * dy <= radius * radius) {
					const x = cx + dx;
					const y = cy + dy;
					if (this.grid.isInBounds(x, y)) {
						// Only place if empty (or always for eraser)
						if (type === 'empty' || this.grid.isEmpty(x, y)) {
							this.addParticle(x, y, type);
						}
					}
				}
			}
		}
	}

	clear(): void {
		this.grid.clear();
	}
}
