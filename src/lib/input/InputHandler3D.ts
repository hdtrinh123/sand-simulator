import * as THREE from 'three';
import type { ParticleType } from '../simulation/particles';
import type { Engine } from '../simulation/Engine';
import type { ThreeRenderer } from '../rendering/ThreeRenderer';

export class InputHandler3D {
	private engine: Engine;
	private renderer: ThreeRenderer;
	private canvas: HTMLCanvasElement;
	private raycaster: THREE.Raycaster;
	private mouse: THREE.Vector2;

	private isDrawing: boolean = false;
	private lastPosition: THREE.Vector3 | null = null;

	// Plane for raycasting when clicking empty space
	private drawPlane: THREE.Plane;
	private planeHelper: THREE.PlaneHelper | null = null;

	selectedElement: ParticleType = 'sand';
	brushSize: number = 2;

	constructor(canvas: HTMLCanvasElement, engine: Engine, renderer: ThreeRenderer) {
		this.canvas = canvas;
		this.engine = engine;
		this.renderer = renderer;

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		// Default draw plane at y = grid.height / 2
		this.drawPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -engine.grid.height / 2);

		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		this.canvas.addEventListener('mousedown', this.handleMouseDown);
		this.canvas.addEventListener('mousemove', this.handleMouseMove);
		this.canvas.addEventListener('mouseup', this.handleMouseUp);
		this.canvas.addEventListener('mouseleave', this.handleMouseUp);

		// Touch events
		this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
		this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
		this.canvas.addEventListener('touchend', this.handleTouchEnd);

		// Prevent context menu
		this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
	}

	private updateMousePosition(clientX: number, clientY: number): void {
		const rect = this.canvas.getBoundingClientRect();
		this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
		this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
	}

	private getDrawPosition(): THREE.Vector3 | null {
		this.raycaster.setFromCamera(this.mouse, this.renderer.getCamera());

		// First, try to hit existing particles (for erasing or building on top)
		const scene = this.renderer.getScene();
		const intersects = this.raycaster.intersectObjects(scene.children, true);

		for (const intersect of intersects) {
			if (intersect.object.type === 'InstancedMesh') {
				// Hit an existing voxel - place adjacent to it
				const point = intersect.point;
				const normal = intersect.face?.normal;

				if (normal) {
					// Convert normal from local to world space
					const worldNormal = normal.clone().transformDirection(intersect.object.matrixWorld);

					// Place new particle on the face we hit
					const gridPos = new THREE.Vector3(
						Math.floor(point.x + worldNormal.x * 0.5),
						Math.floor(point.y + worldNormal.y * 0.5),
						Math.floor(point.z + worldNormal.z * 0.5)
					);

					return gridPos;
				}
			}
		}

		// If no voxel hit, intersect with the draw plane
		const planeIntersect = new THREE.Vector3();
		if (this.raycaster.ray.intersectPlane(this.drawPlane, planeIntersect)) {
			return new THREE.Vector3(
				Math.floor(planeIntersect.x),
				Math.floor(planeIntersect.y),
				Math.floor(planeIntersect.z)
			);
		}

		return null;
	}

	private handleMouseDown = (e: MouseEvent): void => {
		// Only draw with left mouse button
		if (e.button !== 0) return;

		// Check if we're over the controls (orbiting)
		// If shift is held, we're orbiting, not drawing
		if (e.shiftKey) return;

		this.isDrawing = true;
		this.updateMousePosition(e.clientX, e.clientY);
		const pos = this.getDrawPosition();
		if (pos) {
			this.draw(pos);
			this.lastPosition = pos.clone();
		}
	};

	private handleMouseMove = (e: MouseEvent): void => {
		if (!this.isDrawing) return;

		this.updateMousePosition(e.clientX, e.clientY);
		const pos = this.getDrawPosition();

		if (pos) {
			if (this.lastPosition) {
				this.drawLine(this.lastPosition, pos);
			} else {
				this.draw(pos);
			}
			this.lastPosition = pos.clone();
		}
	};

	private handleMouseUp = (): void => {
		this.isDrawing = false;
		this.lastPosition = null;
	};

	private handleTouchStart = (e: TouchEvent): void => {
		e.preventDefault();
		if (e.touches.length === 1) {
			this.isDrawing = true;
			const touch = e.touches[0];
			this.updateMousePosition(touch.clientX, touch.clientY);
			const pos = this.getDrawPosition();
			if (pos) {
				this.draw(pos);
				this.lastPosition = pos.clone();
			}
		}
	};

	private handleTouchMove = (e: TouchEvent): void => {
		e.preventDefault();
		if (!this.isDrawing || e.touches.length !== 1) return;

		const touch = e.touches[0];
		this.updateMousePosition(touch.clientX, touch.clientY);
		const pos = this.getDrawPosition();

		if (pos) {
			if (this.lastPosition) {
				this.drawLine(this.lastPosition, pos);
			} else {
				this.draw(pos);
			}
			this.lastPosition = pos.clone();
		}
	};

	private handleTouchEnd = (): void => {
		this.isDrawing = false;
		this.lastPosition = null;
	};

	private draw(pos: THREE.Vector3): void {
		this.engine.addParticleInRadius(
			Math.round(pos.x),
			Math.round(pos.y),
			Math.round(pos.z),
			this.brushSize,
			this.selectedElement
		);
	}

	private drawLine(from: THREE.Vector3, to: THREE.Vector3): void {
		// 3D Bresenham-like line drawing
		const dx = Math.abs(to.x - from.x);
		const dy = Math.abs(to.y - from.y);
		const dz = Math.abs(to.z - from.z);

		const sx = from.x < to.x ? 1 : -1;
		const sy = from.y < to.y ? 1 : -1;
		const sz = from.z < to.z ? 1 : -1;

		const maxDist = Math.max(dx, dy, dz);
		if (maxDist === 0) {
			this.draw(from);
			return;
		}

		for (let i = 0; i <= maxDist; i++) {
			const t = i / maxDist;
			const x = Math.round(from.x + (to.x - from.x) * t);
			const y = Math.round(from.y + (to.y - from.y) * t);
			const z = Math.round(from.z + (to.z - from.z) * t);
			this.draw(new THREE.Vector3(x, y, z));
		}
	}

	setDrawPlaneHeight(height: number): void {
		this.drawPlane.constant = -height;
	}

	getDrawPlaneHeight(): number {
		return -this.drawPlane.constant;
	}

	destroy(): void {
		this.canvas.removeEventListener('mousedown', this.handleMouseDown);
		this.canvas.removeEventListener('mousemove', this.handleMouseMove);
		this.canvas.removeEventListener('mouseup', this.handleMouseUp);
		this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
		this.canvas.removeEventListener('touchstart', this.handleTouchStart);
		this.canvas.removeEventListener('touchmove', this.handleTouchMove);
		this.canvas.removeEventListener('touchend', this.handleTouchEnd);
	}
}
