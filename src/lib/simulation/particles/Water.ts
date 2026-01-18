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

		// Displace lighter liquids below (oil)
		const below = grid.get(x, y + 1);
		if (below && !below.updated && below.type === 'oil') {
			below.updated = true;
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
			// Displace lighter liquids diagonally
			const diag = grid.get(x + dx, y + 1);
			if (diag && !diag.updated && diag.type === 'oil') {
				diag.updated = true;
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

	// Check if we can move there
	if (grid.isEmpty(nx, y)) {
		// Only spread if there's support below or we're falling into a gap
		const hasSupport = !grid.isEmpty(nx, y + 1);
		if (hasSupport || Math.random() < 0.3) {
			grid.swap(x, y, nx, y);
			return true;
		}
	}

	// Try to displace lighter liquid (oil) horizontally
	const neighbor = grid.get(nx, y);
	if (neighbor && !neighbor.updated && neighbor.type === 'oil') {
		neighbor.updated = true;
		grid.swap(x, y, nx, y);
		return true;
	}

	return false;
}
