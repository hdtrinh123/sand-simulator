import type { ParticleDefinition, Grid } from './types';

export const Oil: ParticleDefinition = {
	id: 'oil',
	name: 'Oil',
	baseColor: 0x3d2914,
	colorVariation: 10,
	density: 1,
	category: 'liquid',
	flammable: true,

	update(grid: Grid, x: number, y: number, z: number): void {
		const particle = grid.get(x, y, z);
		if (!particle || particle.updated) return;
		// swap() will set updated = true when particle moves

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

		// Spread horizontally (slower than water)
		if (Math.random() < 0.5) {
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
	}
};

function shuffleArray<T>(array: T[]): void {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}
