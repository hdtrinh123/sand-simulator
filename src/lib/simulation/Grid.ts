import type { ParticleData, Grid as GridInterface } from './particles/types';
import { particles } from './particles';

// Particle types that are solid for collision purposes
const solidCategories = new Set(['solid', 'powder']);

export class Grid implements GridInterface {
	width: number;
	height: number;
	depth: number;
	private cells: (ParticleData | null)[];

	// Optimization: track which cells have particles
	private activeIndices: Set<number> = new Set();

	// Optimization: track which particles are awake (need simulation)
	private awakeIndices: Set<number> = new Set();

	// Optimization: cache visible particles, only rebuild when dirty
	private visibleCache: { x: number; y: number; z: number; particle: ParticleData }[] = [];
	private cacheValid: boolean = false;

	// Sleep settings
	private readonly sleepThreshold = 3; // Frames without movement before sleeping

	constructor(width: number, height: number, depth: number) {
		this.width = width;
		this.height = height;
		this.depth = depth;
		this.cells = new Array(width * height * depth).fill(null);
	}

	private index(x: number, y: number, z: number): number {
		return z * (this.width * this.height) + y * this.width + x;
	}

	private posFromIndex(idx: number): { x: number; y: number; z: number } {
		const z = Math.floor(idx / (this.width * this.height));
		const remainder = idx % (this.width * this.height);
		const y = Math.floor(remainder / this.width);
		const x = remainder % this.width;
		return { x, y, z };
	}

	isInBounds(x: number, y: number, z: number): boolean {
		return x >= 0 && x < this.width &&
		       y >= 0 && y < this.height &&
		       z >= 0 && z < this.depth;
	}

	get(x: number, y: number, z: number): ParticleData | null {
		if (!this.isInBounds(x, y, z)) return null;
		return this.cells[this.index(x, y, z)];
	}

	set(x: number, y: number, z: number, particle: ParticleData | null): void {
		if (!this.isInBounds(x, y, z)) return;
		const idx = this.index(x, y, z);
		const oldCell = this.cells[idx];

		// Update cell first so canPotentiallyMove works correctly
		this.cells[idx] = particle;

		// Update active indices tracking
		if (particle && particle.type !== 'empty') {
			this.activeIndices.add(idx);
			// Only add to awake if particle can potentially move
			const def = particles[particle.type];
			if (def && !def.isStatic && this.canPotentiallyMove(x, y, z)) {
				this.awakeIndices.add(idx);
			} else {
				this.awakeIndices.delete(idx);
			}
		} else {
			this.activeIndices.delete(idx);
			this.awakeIndices.delete(idx);
		}

		// Invalidate cache if particle state changed
		const wasEmpty = !oldCell || oldCell.type === 'empty';
		const isEmpty = !particle || particle.type === 'empty';
		if (wasEmpty !== isEmpty) {
			this.cacheValid = false;
			// Wake up neighbors when something changes
			this.wakeNeighbors(x, y, z);
		}
	}

	swap(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
		if (!this.isInBounds(x1, y1, z1) || !this.isInBounds(x2, y2, z2)) return;
		const i1 = this.index(x1, y1, z1);
		const i2 = this.index(x2, y2, z2);
		const cell1 = this.cells[i1];
		const cell2 = this.cells[i2];

		// Swap cells
		this.cells[i1] = cell2;
		this.cells[i2] = cell1;

		// Update active indices and awake state
		const hasCell1 = cell1 && cell1.type !== 'empty';
		const hasCell2 = cell2 && cell2.type !== 'empty';

		if (hasCell1 && !hasCell2) {
			this.activeIndices.delete(i1);
			this.activeIndices.add(i2);
			this.awakeIndices.delete(i1);
			this.awakeIndices.add(i2);
			this.cacheValid = false;
		} else if (hasCell2 && !hasCell1) {
			this.activeIndices.delete(i2);
			this.activeIndices.add(i1);
			this.awakeIndices.delete(i2);
			this.awakeIndices.add(i1);
			this.cacheValid = false;
		} else if (hasCell1 && hasCell2) {
			// Both have particles - positions changed, cache invalid
			this.cacheValid = false;
		}

		// Particle moved - mark as updated, reset sleep counter, wake neighbors
		if (cell1) {
			cell1.updated = true;  // Mark as moved this frame
			cell1.sleepCounter = 0;
			cell1.asleep = false;
		}
		if (cell2) {
			cell2.updated = true;  // Mark as moved this frame
			cell2.sleepCounter = 0;
			cell2.asleep = false;
		}

		// Wake up neighbors at both positions
		this.wakeNeighbors(x1, y1, z1);
		this.wakeNeighbors(x2, y2, z2);
	}

	isEmpty(x: number, y: number, z: number): boolean {
		if (!this.isInBounds(x, y, z)) return false;
		const cell = this.cells[this.index(x, y, z)];
		return cell === null || cell.type === 'empty';
	}

	// Check if a cell contains a solid particle (for player collision)
	isSolid(x: number, y: number, z: number): boolean {
		if (!this.isInBounds(x, y, z)) return false;
		const cell = this.cells[this.index(x, y, z)];
		if (!cell || cell.type === 'empty') return false;
		const def = particles[cell.type];
		if (!def) return false;
		return solidCategories.has(def.category);
	}

	clear(): void {
		this.cells.fill(null);
		this.activeIndices.clear();
		this.awakeIndices.clear();
		this.cacheValid = false;
		this.visibleCache = [];
	}

	// Wake up particles in neighboring cells (only if they can move)
	wakeNeighbors(x: number, y: number, z: number): void {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				for (let dz = -1; dz <= 1; dz++) {
					const nx = x + dx;
					const ny = y + dy;
					const nz = z + dz;
					if (this.isInBounds(nx, ny, nz)) {
						const idx = this.index(nx, ny, nz);
						const cell = this.cells[idx];
						if (cell && cell.type !== 'empty') {
							const def = particles[cell.type];
							// Only wake if particle can potentially move
							if (def && !def.isStatic && this.canPotentiallyMove(nx, ny, nz)) {
								cell.asleep = false;
								cell.sleepCounter = 0;
								this.awakeIndices.add(idx);
							}
						}
					}
				}
			}
		}
	}

	// Mark a particle as not having moved this frame (increment sleep counter)
	markDidNotMove(x: number, y: number, z: number): void {
		if (!this.isInBounds(x, y, z)) return;
		const idx = this.index(x, y, z);
		const cell = this.cells[idx];
		if (cell && cell.type !== 'empty') {
			cell.sleepCounter = (cell.sleepCounter || 0) + 1;

			// Simple threshold - avoid expensive canPotentiallyMove() check
			if (cell.sleepCounter >= this.sleepThreshold) {
				cell.asleep = true;
				this.awakeIndices.delete(idx);
			}
		}
	}

	// Get indices of awake particles for simulation
	getAwakeIndices(): Set<number> {
		return this.awakeIndices;
	}

	// Get count of awake particles
	getAwakeCount(): number {
		return this.awakeIndices.size;
	}

	resetUpdated(): void {
		// Only iterate AWAKE particles, not all active - huge perf win
		for (const idx of this.awakeIndices) {
			const cell = this.cells[idx];
			if (cell) cell.updated = false;
		}
	}

	getCells(): (ParticleData | null)[] {
		return this.cells;
	}

	// Get count of active particles
	getActiveCount(): number {
		return this.activeIndices.size;
	}

	// Invalidate render cache (call when simulation runs)
	invalidateCache(): void {
		this.cacheValid = false;
	}

	// Check if a neighbor cell is empty or out of bounds (for occlusion culling)
	private isEmptyOrOutOfBounds(x: number, y: number, z: number): boolean {
		if (!this.isInBounds(x, y, z)) return true;
		const cell = this.cells[this.index(x, y, z)];
		return cell === null || cell.type === 'empty';
	}

	// Check if a particle has any empty neighbor in a direction it could move
	canPotentiallyMove(x: number, y: number, z: number): boolean {
		const cell = this.cells[this.index(x, y, z)];
		if (!cell || cell.type === 'empty') return false;

		const def = particles[cell.type];
		if (!def || def.isStatic) return false;

		// Check based on movement category
		if (def.category === 'powder' || def.category === 'liquid') {
			// Can move if anything below or diagonal-below is empty/out of bounds
			if (this.isEmptyOrOutOfBounds(x, y - 1, z)) return true;
			// Check diagonal-below positions
			const diagonals: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
			for (const [dx, dz] of diagonals) {
				if (this.isEmptyOrOutOfBounds(x + dx, y - 1, z + dz)) return true;
			}
			// Liquids can also spread sideways
			if (def.category === 'liquid') {
				for (const [dx, dz] of diagonals) {
					if (this.isEmptyOrOutOfBounds(x + dx, y, z + dz)) return true;
				}
			}
		}
		if (def.category === 'gas') {
			// Can move if anything above or diagonal-above is empty
			if (this.isEmptyOrOutOfBounds(x, y + 1, z)) return true;
			const diagonals: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
			for (const [dx, dz] of diagonals) {
				if (this.isEmptyOrOutOfBounds(x + dx, y + 1, z + dz)) return true;
			}
		}
		// Special particles (fire, etc.) should stay awake if exposed
		if (def.category === 'special') {
			return this.isExposed(x, y, z);
		}
		return false;
	}

	// Check if a cell has at least one exposed face (for occlusion culling)
	private isExposed(x: number, y: number, z: number): boolean {
		return this.isEmptyOrOutOfBounds(x - 1, y, z) ||
			this.isEmptyOrOutOfBounds(x + 1, y, z) ||
			this.isEmptyOrOutOfBounds(x, y - 1, z) ||
			this.isEmptyOrOutOfBounds(x, y + 1, z) ||
			this.isEmptyOrOutOfBounds(x, y, z - 1) ||
			this.isEmptyOrOutOfBounds(x, y, z + 1);
	}

	// Get all visible particles for rendering (cached)
	getActiveParticles(): { x: number; y: number; z: number; particle: ParticleData }[] {
		if (this.cacheValid) {
			return this.visibleCache;
		}

		// Rebuild cache - only iterate active particles
		this.visibleCache = [];

		for (const idx of this.activeIndices) {
			const particle = this.cells[idx];
			if (particle && particle.type !== 'empty') {
				const { x, y, z } = this.posFromIndex(idx);
				if (this.isExposed(x, y, z)) {
					this.visibleCache.push({ x, y, z, particle });
				}
			}
		}

		this.cacheValid = true;
		return this.visibleCache;
	}
}
