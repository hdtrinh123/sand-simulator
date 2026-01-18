import type { ParticleDefinition, Grid } from './types';

export const Oil: ParticleDefinition = {
	id: 'oil',
	name: 'Oil',
	baseColor: 0x3d2914,
	colorVariation: 10,
	density: 1,
	category: 'liquid',
	flammable: true,

	update(grid: Grid, x: number, y: number): void {
		const particle = grid.get(x, y);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Try to move down
		if (grid.isEmpty(x, y + 1)) {
			grid.swap(x, y, x, y + 1);
			return;
		}

		// Oil floats on water - if water is below, swap
		const below = grid.get(x, y + 1);
		if (below && below.type === 'water') {
			// Water is denser, so water sinks and oil floats
			// This is handled by water's update
		}

		// Try to move diagonally down
		const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
		for (const dx of dirs) {
			if (grid.isEmpty(x + dx, y + 1)) {
				grid.swap(x, y, x + dx, y + 1);
				return;
			}
		}

		// Spread horizontally (slower than water)
		if (Math.random() < 0.5) {
			const spreadDir = Math.random() < 0.5 ? -1 : 1;
			if (grid.isEmpty(x + spreadDir, y)) {
				grid.swap(x, y, x + spreadDir, y);
				return;
			}
			if (grid.isEmpty(x - spreadDir, y)) {
				grid.swap(x, y, x - spreadDir, y);
			}
		}
	}
};
