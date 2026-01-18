import type { ParticleDefinition, Grid } from './types';
import { createParticle } from './types';

export const Fire: ParticleDefinition = {
	id: 'fire',
	name: 'Fire',
	baseColor: 0xff4500,
	colorVariation: 40,
	density: 0,
	category: 'gas',

	update(grid: Grid, x: number, y: number): void {
		const particle = grid.get(x, y);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Decrease life
		if (particle.life !== undefined) {
			particle.life--;
			if (particle.life <= 0) {
				// Sometimes turn into smoke
				if (Math.random() < 0.3) {
					grid.set(x, y, createParticle('smoke', 0x555555, 30));
				} else {
					grid.set(x, y, null);
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

		// Check for water contact - extinguish
		const neighbors = [
			[0, -1], [0, 1], [-1, 0], [1, 0],
			[-1, -1], [1, -1], [-1, 1], [1, 1]
		];

		for (const [dx, dy] of neighbors) {
			const neighbor = grid.get(x + dx, y + dy);
			if (neighbor?.type === 'water') {
				// Extinguish and create steam
				grid.set(x, y, createParticle('smoke', 0xaaaaaa, 20));
				grid.set(x + dx, y + dy, null);
				return;
			}
		}

		// Spread to flammable materials
		for (const [dx, dy] of neighbors) {
			const neighbor = grid.get(x + dx, y + dy);
			if (neighbor && (neighbor.type === 'wood' || neighbor.type === 'oil')) {
				if (Math.random() < 0.02) {
					grid.set(x + dx, y + dy, createParticle('fire', 0xff4500, 40));
				}
			}
		}

		// Rise upward
		if (grid.isEmpty(x, y - 1)) {
			grid.swap(x, y, x, y - 1);
			return;
		}

		// Drift to the sides while rising
		const drift = Math.random() < 0.5 ? -1 : 1;
		if (grid.isEmpty(x + drift, y - 1)) {
			grid.swap(x, y, x + drift, y - 1);
			return;
		}
		if (grid.isEmpty(x - drift, y - 1)) {
			grid.swap(x, y, x - drift, y - 1);
		}
	}
};
