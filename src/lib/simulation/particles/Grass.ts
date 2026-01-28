import type { ParticleDefinition, Grid } from './types';

export const Grass: ParticleDefinition = {
	id: 'grass',
	name: 'Grass',
	baseColor: 0x228B22,
	colorVariation: 25,
	density: 2,
	category: 'solid', // Grass is solid, doesn't fall

	update(grid: Grid, x: number, y: number, z: number): void {
		const particle = grid.get(x, y, z);
		if (!particle || particle.updated) return;
		// Grass checks conditions and may die - swap() handles updated flag

		// Grass dies if no dirt below or if covered
		const below = grid.get(x, y - 1, z);
		if (!below || (below.type !== 'dirt' && below.type !== 'grass')) {
			// No dirt below, grass dies and becomes dirt
			grid.set(x, y, z, null);
			return;
		}

		// Grass dies if something is on top of it (no light)
		const above = grid.get(x, y + 1, z);
		if (above && above.type !== 'empty') {
			// Covered, turn back to dirt
			// Actually just die
			grid.set(x, y, z, null);
			return;
		}
	}
};
