import type { ParticleDefinition, Grid } from './types';

export const Water: ParticleDefinition = {
	id: 'water',
	name: 'Water',
	baseColor: 0x4a90d9,
	colorVariation: 15,
	density: 2,
	category: 'liquid',

	update(grid: Grid, x: number, y: number): void {
		const particle = grid.get(x, y);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Try to move down
		if (grid.isEmpty(x, y + 1)) {
			grid.swap(x, y, x, y + 1);
			return;
		}

		// Displace oil (water is denser)
		const below = grid.get(x, y + 1);
		if (below && below.type === 'oil') {
			grid.swap(x, y, x, y + 1);
			return;
		}

		// Try to move diagonally down
		const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
		for (const dx of dirs) {
			if (grid.isEmpty(x + dx, y + 1)) {
				grid.swap(x, y, x + dx, y + 1);
				return;
			}
		}

		// Spread horizontally
		const spreadDir = Math.random() < 0.5 ? -1 : 1;
		const spreadDist = Math.floor(Math.random() * 3) + 1;

		for (let i = 1; i <= spreadDist; i++) {
			const nx = x + spreadDir * i;
			if (!grid.isEmpty(nx, y)) {
				// Try the other direction
				if (i === 1) {
					for (let j = 1; j <= spreadDist; j++) {
						const mx = x - spreadDir * j;
						if (grid.isEmpty(mx, y)) {
							grid.swap(x, y, mx, y);
							return;
						}
						if (!grid.isEmpty(mx, y)) break;
					}
				}
				break;
			}
			if (i === spreadDist || !grid.isEmpty(nx + spreadDir, y)) {
				grid.swap(x, y, nx, y);
				return;
			}
		}
	}
};
