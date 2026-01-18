import { Grid } from './Grid';
import { particles, createParticle, type ParticleType } from './particles';

export class Engine {
	grid: Grid;
	private running: boolean = false;
	private animationId: number | null = null;
	private lastTime: number = 0;
	private accumulator: number = 0;
	private readonly fixedDeltaTime: number = 1000 / 30; // 30 updates per second for 3D (performance)

	onUpdate?: () => void;

	constructor(width: number, height: number, depth: number) {
		this.grid = new Grid(width, height, depth);
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

		// Process fixed time steps (limit to prevent spiral of death)
		let steps = 0;
		while (this.accumulator >= this.fixedDeltaTime && steps < 2) {
			this.update();
			this.accumulator -= this.fixedDeltaTime;
			steps++;
		}

		this.onUpdate?.();
		this.animationId = requestAnimationFrame(this.loop);
	};

	private update(): void {
		this.grid.resetUpdated();

		// Update from bottom to top (Y direction) for gravity
		// Process each Y layer, randomizing X and Z order
		for (let y = 0; y < this.grid.height; y++) {
			// Randomize X order
			const xIndices = this.getRandomizedOrder(this.grid.width);

			for (const x of xIndices) {
				// Randomize Z order within each X
				const zIndices = this.getRandomizedOrder(this.grid.depth);

				for (const z of zIndices) {
					const particle = this.grid.get(x, y, z);
					if (particle && particle.type !== 'empty') {
						const definition = particles[particle.type];
						if (definition) {
							definition.update(this.grid, x, y, z);
						}
					}
				}
			}
		}
	}

	private getRandomizedOrder(size: number): number[] {
		const indices = Array.from({ length: size }, (_, i) => i);
		// Fisher-Yates shuffle
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}
		return indices;
	}

	addParticle(x: number, y: number, z: number, type: ParticleType): void {
		if (!this.grid.isInBounds(x, y, z)) return;
		if (type === 'empty') {
			this.grid.set(x, y, z, null);
			return;
		}

		const definition = particles[type];
		if (definition) {
			const particle = createParticle(type, definition.baseColor, definition.colorVariation);
			this.grid.set(x, y, z, particle);
		}
	}

	// 3D sphere brush
	addParticleInRadius(cx: number, cy: number, cz: number, radius: number, type: ParticleType): void {
		const r2 = radius * radius;

		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				for (let dz = -radius; dz <= radius; dz++) {
					if (dx * dx + dy * dy + dz * dz <= r2) {
						const x = cx + dx;
						const y = cy + dy;
						const z = cz + dz;

						if (this.grid.isInBounds(x, y, z)) {
							// Only place if empty (or always for eraser)
							if (type === 'empty' || this.grid.isEmpty(x, y, z)) {
								this.addParticle(x, y, z, type);
							}
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
