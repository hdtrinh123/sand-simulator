import type { ParticleDefinition, Grid } from './types';
import { createParticle } from './types';

export const Acid: ParticleDefinition = {
	id: 'acid',
	name: 'Acid',
	baseColor: 0x7fff00,
	colorVariation: 20,
	density: 2,
	category: 'special',

	update(grid: Grid, x: number, y: number, z: number): void {
		const particle = grid.get(x, y, z);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Check for things to dissolve (prioritize below, then sides)
		const neighbors: [number, number, number][] = [
			[0, -1, 0],  // down first
			[-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1],  // sides
			[-1, -1, 0], [1, -1, 0], [0, -1, -1], [0, -1, 1]  // diagonal down
		];

		for (const [dx, dy, dz] of neighbors) {
			const neighbor = grid.get(x + dx, y + dy, z + dz);
			if (neighbor && neighbor.type !== 'acid' && neighbor.type !== 'empty') {
				// Don't dissolve stone
				if (neighbor.type === 'stone') continue;

				// Dissolve the material
				if (Math.random() < 0.1) {
					grid.set(x + dx, y + dy, z + dz, null);
					// Sometimes the acid is consumed too
					if (Math.random() < 0.3) {
						grid.set(x, y, z, createParticle('smoke', 0x88ff88, 30));
						return;
					}
				}
			}
		}

		// Try to move down
		if (grid.isEmpty(x, y - 1, z)) {
			grid.swap(x, y, z, x, y - 1, z);
			return;
		}

		// Try to move diagonally down
		const diagonals: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		shuffleArray(diagonals);

		for (const [dx, dz] of diagonals) {
			if (grid.isEmpty(x + dx, y - 1, z + dz)) {
				grid.swap(x, y, z, x + dx, y - 1, z + dz);
				return;
			}
		}

		// Spread horizontally
		const spreadDirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		shuffleArray(spreadDirs);

		for (const [dx, dz] of spreadDirs) {
			const nx = x + dx;
			const nz = z + dz;

			if (grid.isEmpty(nx, y, nz)) {
				const hasSupport = !grid.isEmpty(nx, y - 1, nz);
				if (hasSupport || Math.random() < 0.3) {
					grid.swap(x, y, z, nx, y, nz);
					return;
				}
			}
		}
	}
};

function shuffleArray<T>(array: T[]): void {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}
