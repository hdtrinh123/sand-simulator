import type { ParticleData, Grid as GridInterface } from './particles/types';

export class Grid implements GridInterface {
	width: number;
	height: number;
	depth: number;
	private cells: (ParticleData | null)[];

	constructor(width: number, height: number, depth: number) {
		this.width = width;
		this.height = height;
		this.depth = depth;
		this.cells = new Array(width * height * depth).fill(null);
	}

	private index(x: number, y: number, z: number): number {
		return z * (this.width * this.height) + y * this.width + x;
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
		this.cells[this.index(x, y, z)] = particle;
	}

	swap(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
		if (!this.isInBounds(x1, y1, z1) || !this.isInBounds(x2, y2, z2)) return;
		const i1 = this.index(x1, y1, z1);
		const i2 = this.index(x2, y2, z2);
		const temp = this.cells[i1];
		this.cells[i1] = this.cells[i2];
		this.cells[i2] = temp;
	}

	isEmpty(x: number, y: number, z: number): boolean {
		if (!this.isInBounds(x, y, z)) return false;
		const cell = this.cells[this.index(x, y, z)];
		return cell === null || cell.type === 'empty';
	}

	clear(): void {
		this.cells.fill(null);
	}

	resetUpdated(): void {
		for (const cell of this.cells) {
			if (cell) cell.updated = false;
		}
	}

	getCells(): (ParticleData | null)[] {
		return this.cells;
	}

	// Get all active particles with their positions for rendering
	getActiveParticles(): { x: number; y: number; z: number; particle: ParticleData }[] {
		const active: { x: number; y: number; z: number; particle: ParticleData }[] = [];

		for (let z = 0; z < this.depth; z++) {
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					const particle = this.get(x, y, z);
					if (particle && particle.type !== 'empty') {
						active.push({ x, y, z, particle });
					}
				}
			}
		}

		return active;
	}
}
