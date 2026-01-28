import { Grid } from './Grid';
import { particles, createParticle, type ParticleType } from './particles';

export interface PerformanceStats {
	fps: number;
	simulationMs: number;
	renderMs: number;
	awakeParticles: number;
	totalParticles: number;
	visibleParticles: number;
}

export class Engine {
	grid: Grid;
	private running: boolean = false;
	private animationId: number | null = null;
	private lastTime: number = 0;
	private accumulator: number = 0;
	private readonly fixedDeltaTime: number = 1000 / 60; // 60 updates per second

	// Performance tracking
	private frameCount: number = 0;
	private lastFpsTime: number = 0;
	private currentFps: number = 0;
	private lastSimulationMs: number = 0;
	private simulationMsAccum: number = 0;
	private simulationFrameCount: number = 0;

	// Render time (set by renderer)
	renderMs: number = 0;

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

		// FPS tracking
		this.frameCount++;
		if (currentTime - this.lastFpsTime >= 1000) {
			this.currentFps = this.frameCount;
			this.frameCount = 0;
			this.lastFpsTime = currentTime;

			// Average simulation time over the last second
			if (this.simulationFrameCount > 0) {
				this.lastSimulationMs = this.simulationMsAccum / this.simulationFrameCount;
			}
			this.simulationMsAccum = 0;
			this.simulationFrameCount = 0;
		}

		this.accumulator += deltaTime;

		// Adaptive time step based on AWAKE particle count (not total)
		const awakeCount = this.grid.getAwakeCount();

		// Skip simulation entirely if nothing is awake
		if (awakeCount === 0) {
			this.accumulator = 0;
			this.onUpdate?.();
			this.animationId = requestAnimationFrame(this.loop);
			return;
		}

		const adaptiveDelta = awakeCount > 30000 ? this.fixedDeltaTime * 3 :
			awakeCount > 15000 ? this.fixedDeltaTime * 2 :
			awakeCount > 5000 ? this.fixedDeltaTime * 1.5 :
			this.fixedDeltaTime;

		// Process fixed time steps (limit to prevent spiral of death)
		let steps = 0;
		const maxSteps = awakeCount > 20000 ? 1 : 2;
		while (this.accumulator >= adaptiveDelta && steps < maxSteps) {
			const simStart = performance.now();
			this.update();
			this.simulationMsAccum += performance.now() - simStart;
			this.simulationFrameCount++;
			this.accumulator -= adaptiveDelta;
			steps++;
		}

		// Cap accumulator to prevent catch-up death spiral
		if (this.accumulator > adaptiveDelta * 2) {
			this.accumulator = 0;
		}

		this.onUpdate?.();
		this.animationId = requestAnimationFrame(this.loop);
	};

	private update(): void {
		this.grid.resetUpdated();

		const awakeIndices = this.grid.getAwakeIndices();

		// Skip update if nothing is awake
		if (awakeIndices.size === 0) {
			return;
		}

		let anyMoved = false;

		// Collect awake particles and sort by Y (bottom to top for gravity)
		const awakeParticles: { x: number; y: number; z: number; idx: number }[] = [];
		for (const idx of awakeIndices) {
			const z = Math.floor(idx / (this.grid.width * this.grid.height));
			const remainder = idx % (this.grid.width * this.grid.height);
			const y = Math.floor(remainder / this.grid.width);
			const x = remainder % this.grid.width;
			awakeParticles.push({ x, y, z, idx });
		}

		// Sort by Y (ascending) for proper gravity simulation
		awakeParticles.sort((a, b) => a.y - b.y);

		// Shuffle particles at same Y level for randomness
		let i = 0;
		while (i < awakeParticles.length) {
			let j = i;
			while (j < awakeParticles.length && awakeParticles[j].y === awakeParticles[i].y) {
				j++;
			}
			// Shuffle range [i, j)
			for (let k = j - 1; k > i; k--) {
				const r = i + Math.floor(Math.random() * (k - i + 1));
				const temp = awakeParticles[k];
				awakeParticles[k] = awakeParticles[r];
				awakeParticles[r] = temp;
			}
			i = j;
		}

		// Update only awake particles
		for (const { x, y, z } of awakeParticles) {
			const particle = this.grid.get(x, y, z);
			if (particle && particle.type !== 'empty' && !particle.updated) {
				const definition = particles[particle.type];
				if (definition) {
					// Skip static particles entirely
					if (definition.isStatic) {
						this.grid.markDidNotMove(x, y, z);
						continue;
					}

					definition.update(this.grid, x, y, z);

					// Check if particle moved (updated flag is set by swap)
					if (particle.updated) {
						anyMoved = true;
					} else {
						// Particle didn't move, increment sleep counter
						this.grid.markDidNotMove(x, y, z);
					}
				}
			}
		}

		// Invalidate render cache since particles may have moved
		if (anyMoved) {
			this.grid.invalidateCache();
		}
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

	getStats(): PerformanceStats {
		return {
			fps: this.currentFps,
			simulationMs: Math.round(this.lastSimulationMs * 100) / 100,
			renderMs: Math.round(this.renderMs * 100) / 100,
			awakeParticles: this.grid.getAwakeCount(),
			totalParticles: this.grid.getActiveCount(),
			visibleParticles: this.grid.getActiveParticles().length
		};
	}

	// Simple noise function for terrain generation
	private noise2D(x: number, z: number, seed: number): number {
		// Simple hash-based noise
		const hash = (n: number) => {
			let h = n * 374761393 + seed;
			h = (h ^ (h >> 13)) * 1274126177;
			return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
		};

		const ix = Math.floor(x);
		const iz = Math.floor(z);
		const fx = x - ix;
		const fz = z - iz;

		// Smooth interpolation
		const sx = fx * fx * (3 - 2 * fx);
		const sz = fz * fz * (3 - 2 * fz);

		const v00 = hash(ix + iz * 57);
		const v10 = hash(ix + 1 + iz * 57);
		const v01 = hash(ix + (iz + 1) * 57);
		const v11 = hash(ix + 1 + (iz + 1) * 57);

		const v0 = v00 + sx * (v10 - v00);
		const v1 = v01 + sx * (v11 - v01);

		return v0 + sz * (v1 - v0);
	}

	// Fractal noise for more natural terrain
	private fractalNoise(x: number, z: number, seed: number, octaves: number = 4): number {
		let value = 0;
		let amplitude = 1;
		let frequency = 1;
		let maxValue = 0;

		for (let i = 0; i < octaves; i++) {
			value += this.noise2D(x * frequency, z * frequency, seed + i * 1000) * amplitude;
			maxValue += amplitude;
			amplitude *= 0.5;
			frequency *= 2;
		}

		return value / maxValue;
	}

	// Generate a random continuous terrain
	generateWorld(): void {
		this.clear();

		const w = this.grid.width;
		const h = this.grid.height;
		const d = this.grid.depth;

		const seed = Math.floor(Math.random() * 100000);
		const scale = 0.05; // Controls terrain frequency
		const heightScale = h * 0.4; // Max terrain height
		const baseHeight = 8; // Minimum terrain height

		// Generate heightmap and fill terrain
		for (let x = 0; x < w; x++) {
			for (let z = 0; z < d; z++) {
				// Get noise value for this position
				const noise = this.fractalNoise(x * scale, z * scale, seed, 4);
				const terrainHeight = Math.floor(baseHeight + noise * heightScale);

				// Fill column with dirt up to terrain height
				for (let y = 0; y < Math.min(terrainHeight, h); y++) {
					this.addParticle(x, y, z, 'dirt');
				}
			}
		}
	}

	// Fill a box with particles
	private fillBox(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, type: ParticleType): void {
		for (let y = y1; y < y2; y++) {
			for (let x = x1; x < x2; x++) {
				for (let z = z1; z < z2; z++) {
					if (this.grid.isInBounds(x, y, z)) {
						this.addParticle(x, y, z, type);
					}
				}
			}
		}
	}

	// Fill a rough pyramid shape
	private fillPyramid(cx: number, baseY: number, cz: number, radius: number, type: ParticleType): void {
		for (let r = radius; r > 0; r--) {
			const y = baseY + (radius - r);
			for (let dx = -r; dx <= r; dx++) {
				for (let dz = -r; dz <= r; dz++) {
					const x = cx + dx;
					const z = cz + dz;
					if (this.grid.isInBounds(x, y, z)) {
						this.addParticle(x, y, z, type);
					}
				}
			}
		}
	}
}
