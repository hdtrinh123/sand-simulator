export type ParticleType =
	| 'empty'
	| 'sand'
	| 'water'
	| 'stone'
	| 'fire'
	| 'wood'
	| 'smoke'
	| 'oil'
	| 'acid';

export interface ParticleData {
	type: ParticleType;
	color: number;
	life?: number;
	updated?: boolean;
}

export interface ParticleDefinition {
	id: ParticleType;
	name: string;
	baseColor: number;
	colorVariation: number;
	density: number;
	category: 'solid' | 'powder' | 'liquid' | 'gas' | 'special';
	flammable?: boolean;
	update: (grid: Grid, x: number, y: number) => void;
}

export interface Grid {
	width: number;
	height: number;
	get(x: number, y: number): ParticleData | null;
	set(x: number, y: number, particle: ParticleData): void;
	swap(x1: number, y1: number, x2: number, y2: number): void;
	isEmpty(x: number, y: number): boolean;
	isInBounds(x: number, y: number): boolean;
	clear(): void;
}

export function createParticle(type: ParticleType, baseColor: number, variation: number): ParticleData {
	const colorOffset = Math.floor(Math.random() * variation * 2) - variation;
	const r = ((baseColor >> 16) & 0xff) + colorOffset;
	const g = ((baseColor >> 8) & 0xff) + colorOffset;
	const b = (baseColor & 0xff) + colorOffset;
	const clamp = (v: number) => Math.max(0, Math.min(255, v));
	const color = (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);

	return {
		type,
		color,
		life: type === 'fire' ? 60 + Math.floor(Math.random() * 40) : undefined,
		updated: false
	};
}
