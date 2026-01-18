import type { ParticleDefinition, Grid } from './types';

export const Wood: ParticleDefinition = {
	id: 'wood',
	name: 'Wood',
	baseColor: 0x8b4513,
	colorVariation: 20,
	density: 5,
	category: 'solid',
	flammable: true,

	update(_grid: Grid, _x: number, _y: number, _z: number): void {
		// Wood doesn't move, but can be ignited by Fire
		// Fire spreading is handled in Fire.update()
	}
};
