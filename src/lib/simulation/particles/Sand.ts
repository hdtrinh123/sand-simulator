import type { ParticleDefinition, Grid } from './types';

export const Sand: ParticleDefinition = {
	id: 'sand',
	name: 'Sand',
	baseColor: 0xc2b280,
	colorVariation: 20,
	density: 3,
	category: 'powder',

	update(grid: Grid, x: number, y: number, z: number): void {
		const particle = grid.get(x, y, z);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Try to move down (Y-1 in Three.js coordinates)
		if (grid.isEmpty(x, y - 1, z)) {
			grid.swap(x, y, z, x, y - 1, z);
			return;
		}

		// Check if we can displace a liquid below
		const below = grid.get(x, y - 1, z);
		if (below && (below.type === 'water' || below.type === 'oil')) {
			grid.swap(x, y, z, x, y - 1, z);
			return;
		}

		// Try to move diagonally down in XZ plane (4 diagonal directions)
		const diagonals = [
			[-1, 0], [1, 0], [0, -1], [0, 1],  // cardinal
			[-1, -1], [-1, 1], [1, -1], [1, 1] // diagonals
		];
		// Shuffle for randomness
		for (let i = diagonals.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[diagonals[i], diagonals[j]] = [diagonals[j], diagonals[i]];
		}

		for (const [dx, dz] of diagonals) {
			if (grid.isEmpty(x + dx, y - 1, z + dz)) {
				grid.swap(x, y, z, x + dx, y - 1, z + dz);
				return;
			}
			const diag = grid.get(x + dx, y - 1, z + dz);
			if (diag && (diag.type === 'water' || diag.type === 'oil')) {
				grid.swap(x, y, z, x + dx, y - 1, z + dz);
				return;
			}
		}
	}
};
