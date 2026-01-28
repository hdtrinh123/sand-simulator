import type { ParticleDefinition, Grid } from './types';
import { createParticle } from './types';

export const Fire: ParticleDefinition = {
	id: 'fire',
	name: 'Fire',
	baseColor: 0xff4500,
	colorVariation: 40,
	density: 0,
	category: 'gas',

	update(grid: Grid, x: number, y: number, z: number): void {
		const particle = grid.get(x, y, z);
		if (!particle || particle.updated) return;
		// Fire always does work (life countdown), mark as processed
		particle.updated = true; // Fire is special - always active while alive

		// Decrease life
		if (particle.life !== undefined) {
			particle.life--;
			if (particle.life <= 0) {
				// Sometimes turn into smoke
				if (Math.random() < 0.3) {
					grid.set(x, y, z, createParticle('smoke', 0x555555, 30));
				} else {
					grid.set(x, y, z, null);
				}
				return;
			}
		}

		// Update color based on life (fade to darker red/orange)
		if (particle.life !== undefined && particle.life < 30) {
			const intensity = particle.life / 30;
			const r = Math.floor(255 * intensity);
			const g = Math.floor(69 * intensity);
			particle.color = (r << 16) | (g << 8) | 0;
		}

		// Check for water contact - extinguish (check all 6 faces + 20 edge/corner neighbors = 26 total)
		const neighbors: [number, number, number][] = [];
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dz = -1; dz <= 1; dz++) {
					if (dx !== 0 || dy !== 0 || dz !== 0) {
						neighbors.push([dx, dy, dz]);
					}
				}
			}
		}

		for (const [dx, dy, dz] of neighbors) {
			const neighbor = grid.get(x + dx, y + dy, z + dz);
			if (neighbor?.type === 'water') {
				// Extinguish and create steam
				grid.set(x, y, z, createParticle('smoke', 0xaaaaaa, 20));
				grid.set(x + dx, y + dy, z + dz, null);
				return;
			}
		}

		// Spread to flammable materials
		for (const [dx, dy, dz] of neighbors) {
			const neighbor = grid.get(x + dx, y + dy, z + dz);
			if (neighbor && (neighbor.type === 'wood' || neighbor.type === 'oil')) {
				if (Math.random() < 0.02) {
					grid.set(x + dx, y + dy, z + dz, createParticle('fire', 0xff4500, 40));
				}
			}
		}

		// Rise upward (Y+1 in Three.js)
		if (grid.isEmpty(x, y + 1, z)) {
			grid.swap(x, y, z, x, y + 1, z);
			return;
		}

		// Drift to the sides while rising
		const drifts: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		shuffleArray(drifts);

		for (const [dx, dz] of drifts) {
			if (grid.isEmpty(x + dx, y + 1, z + dz)) {
				grid.swap(x, y, z, x + dx, y + 1, z + dz);
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
