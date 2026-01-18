import type { ParticleDefinition, Grid } from './types';

export const Smoke: ParticleDefinition = {
	id: 'smoke',
	name: 'Smoke',
	baseColor: 0x555555,
	colorVariation: 30,
	density: 0,
	category: 'gas',

	update(grid: Grid, x: number, y: number, z: number): void {
		const particle = grid.get(x, y, z);
		if (!particle || particle.updated) return;
		particle.updated = true;

		// Initialize life if not set
		if (particle.life === undefined) {
			particle.life = 100 + Math.floor(Math.random() * 50);
		}

		// Decrease life and fade
		particle.life--;
		if (particle.life <= 0) {
			grid.set(x, y, z, null);
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
			if (grid.isEmpty(x, y + 1, z)) {
				grid.swap(x, y, z, x, y + 1, z);
				return;
			}

			// Drift to sides while rising
			const drifts: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
			shuffleArray(drifts);

			for (const [dx, dz] of drifts) {
				if (grid.isEmpty(x + dx, y + 1, z + dz)) {
					grid.swap(x, y, z, x + dx, y + 1, z + dz);
					return;
				}
			}

			// Try to move sideways
			for (const [dx, dz] of drifts) {
				if (grid.isEmpty(x + dx, y, z + dz)) {
					grid.swap(x, y, z, x + dx, y, z + dz);
					return;
				}
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
