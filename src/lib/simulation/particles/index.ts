import type { ParticleDefinition, ParticleType } from './types';
import { Sand } from './Sand';
import { Dirt } from './Dirt';
import { Grass } from './Grass';
import { Water } from './Water';
import { Stone } from './Stone';
import { Fire } from './Fire';
import { Wood } from './Wood';
import { Smoke } from './Smoke';
import { Oil } from './Oil';
import { Acid } from './Acid';

export * from './types';

export const particles: Record<ParticleType, ParticleDefinition | null> = {
	empty: null,
	sand: Sand,
	dirt: Dirt,
	grass: Grass,
	water: Water,
	stone: Stone,
	fire: Fire,
	wood: Wood,
	smoke: Smoke,
	oil: Oil,
	acid: Acid
};

export const particleList: ParticleDefinition[] = [
	Sand,
	Dirt,
	Grass,
	Water,
	Stone,
	Fire,
	Wood,
	Smoke,
	Oil,
	Acid
];

export function getParticleDefinition(type: ParticleType): ParticleDefinition | null {
	return particles[type];
}
