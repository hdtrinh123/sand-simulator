import type { ParticleDefinition, Grid } from './types';

export const Smoke: ParticleDefinition = {
	id: 'smoke',
	name: 'Smoke',
	baseColor: 0x555555,
	colorVariation: 30,
	density: 0,
	category: 'gas',

	update(grid: Grid, x: number, y: number): void {
		const particle = grid.get(x, y);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Initialize life if not set
		if (particle.life === undefined) {
			particle.life = 100 + Math.floor(Math.random() * 50);
		}

		// Decrease life and fade
		particle.life--;
		if (particle.life <= 0) {
			grid.set(x, y, null);
			return;
		}

		// Fade color as smoke dissipates
		if (particle.life < 50) {
			const alpha = particle.life / 50;
			const gray = Math.floor(85 * alpha);
			particle.color = (gray << 16) | (gray << 8) | gray;
		}

		// Rise upward with some randomness
		if (Math.random() < 0.8) {
			if (grid.isEmpty(x, y - 1)) {
				grid.swap(x, y, x, y - 1);
				return;
			}

			// Drift to sides while rising
			const drift = Math.random() < 0.5 ? -1 : 1;
			if (grid.isEmpty(x + drift, y - 1)) {
				grid.swap(x, y, x + drift, y - 1);
				return;
			}
			if (grid.isEmpty(x - drift, y - 1)) {
				grid.swap(x, y, x - drift, y - 1);
				return;
			}

			// Try to move sideways
			if (grid.isEmpty(x + drift, y)) {
				grid.swap(x, y, x + drift, y);
			}
		}
	}
};
