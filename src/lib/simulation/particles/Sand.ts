import type { ParticleDefinition, Grid } from './types';

export const Sand: ParticleDefinition = {
	id: 'sand',
	name: 'Sand',
	baseColor: 0xc2b280,
	colorVariation: 20,
	density: 3,
	category: 'powder',

	update(grid: Grid, x: number, y: number): void {
		const particle = grid.get(x, y);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Try to move down
		if (grid.isEmpty(x, y + 1)) {
			grid.swap(x, y, x, y + 1);
			return;
		}

		// Check if we can displace a liquid below
		const below = grid.get(x, y + 1);
		if (below && (below.type === 'water' || below.type === 'oil')) {
			grid.swap(x, y, x, y + 1);
			return;
		}

		// Try to move diagonally down (randomize direction to prevent bias)
		const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
		for (const dx of dirs) {
			if (grid.isEmpty(x + dx, y + 1)) {
				grid.swap(x, y, x + dx, y + 1);
				return;
			}
			const diag = grid.get(x + dx, y + 1);
			if (diag && (diag.type === 'water' || diag.type === 'oil')) {
				grid.swap(x, y, x + dx, y + 1);
				return;
			}
		}
	}
};
