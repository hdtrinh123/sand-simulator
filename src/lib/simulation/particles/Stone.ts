import type { ParticleDefinition, Grid } from './types';

export const Stone: ParticleDefinition = {
	id: 'stone',
	name: 'Stone',
	baseColor: 0x808080,
	colorVariation: 25,
	density: 10,
	category: 'solid',

	update(_grid: Grid, _x: number, _y: number): void {
		// Stone doesn't move
	}
};
