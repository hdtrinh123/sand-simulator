import type { ParticleData, Grid as GridInterface } from './particles/types';

export class Grid implements GridInterface {
	width: number;
	height: number;
	private cells: (ParticleData | null)[];

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.cells = new Array(width * height).fill(null);
	}

	private index(x: number, y: number): number {
		return y * this.width + x;
	}

	isInBounds(x: number, y: number): boolean {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	get(x: number, y: number): ParticleData | null {
		if (!this.isInBounds(x, y)) return null;
		return this.cells[this.index(x, y)];
	}

	set(x: number, y: number, particle: ParticleData | null): void {
		if (!this.isInBounds(x, y)) return;
		this.cells[this.index(x, y)] = particle;
	}

	swap(x1: number, y1: number, x2: number, y2: number): void {
		if (!this.isInBounds(x1, y1) || !this.isInBounds(x2, y2)) return;
		const i1 = this.index(x1, y1);
		const i2 = this.index(x2, y2);
		const temp = this.cells[i1];
		this.cells[i1] = this.cells[i2];
		this.cells[i2] = temp;
	}

	isEmpty(x: number, y: number): boolean {
		if (!this.isInBounds(x, y)) return false;
		const cell = this.cells[this.index(x, y)];
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
}
