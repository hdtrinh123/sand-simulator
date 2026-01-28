import type { ParticleDefinition, Grid } from './types';
import { createParticle } from './types';

export const Dirt: ParticleDefinition = {
	id: 'dirt',
	name: 'Dirt',
	baseColor: 0x8B4513,
	colorVariation: 15,
	density: 4,
	category: 'powder',

	update(grid: Grid, x: number, y: number, z: number): void {
		const particle = grid.get(x, y, z);
		if (!particle || particle.updated) return;
		// Don't set updated here - swap() will set it if particle actually moves

		// Try to move down
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

		// Try to move diagonally down
		const diagonals = [
			[-1, 0], [1, 0], [0, -1], [0, 1],
			[-1, -1], [-1, 1], [1, -1], [1, 1]
		];
		for (let i = diagonals.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[diagonals[i], diagonals[j]] = [diagonals[j], diagonals[i]];
		}

		for (const [dx, dz] of diagonals) {
			if (grid.isEmpty(x + dx, y - 1, z + dz)) {
				grid.swap(x, y, z, x + dx, y - 1, z + dz);
				return;
			}
		}

		// Only try grass growth if directly exposed (empty above)
		// This is a rare check, so skip most of the time
		if (grid.isEmpty(x, y + 1, z)) {
			// Low chance to grow grass - reduces CPU usage
			if (Math.random() < 0.002) {
				// Check for light (nothing solid above for a few cells)
				let hasLight = true;
				for (let checkY = y + 2; checkY < Math.min(y + 8, grid.height); checkY++) {
					const above = grid.get(x, checkY, z);
					if (above && above.type !== 'empty' && above.type !== 'grass') {
						hasLight = false;
						break;
					}
				}

				if (hasLight) {
					// Grow grass on top
					grid.set(x, y + 1, z, createParticle('grass', 0x228B22, 25));
				}
			}
		}
	}
};
