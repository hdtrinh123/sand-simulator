import type { ParticleDefinition, ParticleType } from './types';
import { Sand } from './Sand';
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
