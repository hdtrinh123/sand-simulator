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

		// Oil is lighter than water - don't try to displace it, let water push us up
		// Just check if we can fall

		// Try to move diagonally down
		const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
		for (const dx of dirs) {
			if (grid.isEmpty(x + dx, y + 1)) {
				grid.swap(x, y, x + dx, y + 1);
				return;
			}
		}

		// Spread horizontally - try both directions
		const spreadDir = Math.random() < 0.5 ? 1 : -1;

		// Try primary direction
		if (trySpread(grid, x, y, spreadDir)) return;
		// Try opposite direction
		trySpread(grid, x, y, -spreadDir);
	}
};

function trySpread(grid: Grid, x: number, y: number, dir: number): boolean {
	const nx = x + dir;

	if (grid.isEmpty(nx, y)) {
		// Only spread if there's support below
		const hasSupport = !grid.isEmpty(nx, y + 1);
		if (hasSupport || Math.random() < 0.3) {
			const particle = grid.get(x, y);
			if (particle) {
				grid.swap(x, y, nx, y);
				return true;
			}
		}
	}

	return false;
}
