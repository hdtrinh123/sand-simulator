import type { ParticleDefinition, Grid } from './types';

export const Water: ParticleDefinition = {
	id: 'water',
	name: 'Water',
	baseColor: 0x4a90d9,
	colorVariation: 15,
	density: 2,
	category: 'liquid',

	update(grid: Grid, x: number, y: number, z: number): void {
		const particle = grid.get(x, y, z);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Try to move down
		if (grid.isEmpty(x, y - 1, z)) {
			grid.swap(x, y, z, x, y - 1, z);
			return;
		}

		// Displace oil (water is denser)
		const below = grid.get(x, y - 1, z);
		if (below && !below.updated && below.type === 'oil') {
			below.updated = true;
			grid.swap(x, y, z, x, y - 1, z);
			return;
		}

		// Try to move diagonally down
		const diagonals = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		shuffleArray(diagonals);

		for (const [dx, dz] of diagonals) {
			if (grid.isEmpty(x + dx, y - 1, z + dz)) {
				grid.swap(x, y, z, x + dx, y - 1, z + dz);
				return;
			}
			const diag = grid.get(x + dx, y - 1, z + dz);
			if (diag && !diag.updated && diag.type === 'oil') {
				diag.updated = true;
				grid.swap(x, y, z, x + dx, y - 1, z + dz);
				return;
			}
		}

		// Spread horizontally in XZ plane
		const spreadDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		shuffleArray(spreadDirs);

		for (const [dx, dz] of spreadDirs) {
			const nx = x + dx;
			const nz = z + dz;

			if (grid.isEmpty(nx, y, nz)) {
				// Only spread if there's support below
				const hasSupport = !grid.isEmpty(nx, y - 1, nz);
				if (hasSupport || Math.random() < 0.3) {
					grid.swap(x, y, z, nx, y, nz);
					return;
				}
			}

			// Displace oil horizontally
			const neighbor = grid.get(nx, y, nz);
			if (neighbor && !neighbor.updated && neighbor.type === 'oil') {
				neighbor.updated = true;
				grid.swap(x, y, z, nx, y, nz);
				return;
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
