import type { ParticleDefinition, Grid } from './types';
import { createParticle } from './types';

export const Acid: ParticleDefinition = {
	id: 'acid',
	name: 'Acid',
	baseColor: 0x7fff00,
	colorVariation: 20,
	density: 2,
	category: 'special',

	update(grid: Grid, x: number, y: number): void {
		const particle = grid.get(x, y);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Check for things to dissolve
		const neighbors = [
			[0, 1],   // down first (priority)
			[-1, 0], [1, 0],
			[-1, 1], [1, 1]
		];

		for (const [dx, dy] of neighbors) {
			const neighbor = grid.get(x + dx, y + dy);
			if (neighbor && neighbor.type !== 'acid' && neighbor.type !== 'empty') {
				// Don't dissolve stone
				if (neighbor.type === 'stone') continue;

				// Dissolve the material
				if (Math.random() < 0.1) {
					grid.set(x + dx, y + dy, null);
					// Sometimes the acid is consumed too
					if (Math.random() < 0.3) {
						// Create smoke as byproduct
						grid.set(x, y, createParticle('smoke', 0x88ff88, 30));
						return;
					}
				}
			}
		}

		// Try to move down
		if (grid.isEmpty(x, y + 1)) {
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
		if (grid.isEmpty(x + spreadDir, y)) {
			grid.swap(x, y, x + spreadDir, y);
			return;
		}
		if (grid.isEmpty(x - spreadDir, y)) {
			grid.swap(x, y, x - spreadDir, y);
		}
	}
};
