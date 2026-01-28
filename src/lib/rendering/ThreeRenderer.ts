import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { Grid } from '../simulation/Grid';

export type CameraMode = 'orbit' | 'firstperson';

export class ThreeRenderer {
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private orbitControls: OrbitControls;
	private pointerLockControls: PointerLockControls;
	private grid: Grid;
	private canvas: HTMLCanvasElement;

	private instancedMesh: THREE.InstancedMesh;
	private maxInstances: number;
	private dummy: THREE.Object3D;
	private colorAttribute: THREE.InstancedBufferAttribute;

	private bgColor: number = 0x1a1a2e;

	// Optimization: track last render state to skip unnecessary updates
	private lastParticleCount: number = 0;
	private lastCacheRef: object | null = null;
	private frameCounter: number = 0;

	// Performance tracking
	private lastRenderMs: number = 0;
	private renderMsAccum: number = 0;
	private renderFrameCount: number = 0;
	private lastStatsTime: number = 0;

	// Camera mode
	private _cameraMode: CameraMode = 'orbit';

	// First-person movement
	private moveForward = false;
	private moveBackward = false;
	private moveLeft = false;
	private moveRight = false;
	private moveUp = false;
	private moveDown = false;
	private velocity = new THREE.Vector3();
	private direction = new THREE.Vector3();
	private lastTime = performance.now();

	// Player settings (in grid units)
	// Player is 8 cells tall, 2 cells wide
	private readonly playerWidth = 2; // X and Z size
	private readonly playerHeight = 8;
	private readonly playerEyeHeight = 7.5; // Eyes near top of head
	private readonly moveSpeed = 15; // units per second
	private readonly gravity = 32; // units per second squared
	private readonly jumpSpeed = 12; // initial jump velocity
	private readonly maxStepHeight = 2; // Max height player can step up (slope walking)
	private isOnGround = false;
	private readonly skinWidth = 0.01; // Small buffer to prevent floating point issues

	onModeChange?: (mode: CameraMode) => void;

	constructor(canvas: HTMLCanvasElement, grid: Grid) {
		this.grid = grid;
		this.canvas = canvas;
		this.maxInstances = grid.width * grid.height * grid.depth;

		// Scene setup
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(this.bgColor);

		// Camera setup
		const aspect = canvas.clientWidth / canvas.clientHeight;
		this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

		// Position camera to see the whole grid (orbit mode default)
		const maxDim = Math.max(grid.width, grid.height, grid.depth);
		this.camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
		this.camera.lookAt(grid.width / 2, grid.height / 2, grid.depth / 2);

		// Renderer setup
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: false, // Disable antialiasing for performance
			powerPreference: 'high-performance'
		});
		this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		this.renderer.setPixelRatio(1); // Use 1:1 pixel ratio for performance

		// Orbit controls
		this.orbitControls = new OrbitControls(this.camera, canvas);
		this.orbitControls.target.set(grid.width / 2, grid.height / 2, grid.depth / 2);
		this.orbitControls.enableDamping = true;
		this.orbitControls.dampingFactor = 0.05;
		this.orbitControls.update();

		// Pointer lock controls for first-person
		this.pointerLockControls = new PointerLockControls(this.camera, canvas);
		this.pointerLockControls.addEventListener('unlock', () => {
			// When pointer lock is released, switch back to orbit mode
			if (this._cameraMode === 'firstperson') {
				this.setCameraMode('orbit');
			}
		});

		// Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(maxDim, maxDim * 2, maxDim);
		this.scene.add(directionalLight);

		// Create instanced mesh for voxels (full size, no gaps)
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshLambertMaterial({ vertexColors: true });

		this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
		this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.instancedMesh.count = 0;
		// Disable frustum culling - instances are spread across the grid,
		// but Three.js uses the geometry's bounding sphere (at origin) for culling
		this.instancedMesh.frustumCulled = false;

		// Create color attribute for per-instance colors
		const colors = new Float32Array(this.maxInstances * 3);
		this.colorAttribute = new THREE.InstancedBufferAttribute(colors, 3);
		this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
		geometry.setAttribute('color', this.colorAttribute);

		// Override material to use instance colors
		this.instancedMesh.material = new THREE.MeshLambertMaterial({
			vertexColors: false
		});

		this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
			new Float32Array(this.maxInstances * 3),
			3
		);
		this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

		this.scene.add(this.instancedMesh);

		this.dummy = new THREE.Object3D();

		// Add floor grid for reference
		this.addFloorGrid();

		// Setup keyboard listeners for first-person movement
		this.setupKeyboardListeners();
	}

	private addFloorGrid(): void {
		const gridHelper = new THREE.GridHelper(
			Math.max(this.grid.width, this.grid.depth),
			Math.max(this.grid.width, this.grid.depth),
			0x444444,
			0x333333
		);
		gridHelper.position.set(
			this.grid.width / 2,
			-0.5,
			this.grid.depth / 2
		);
		this.scene.add(gridHelper);

		// Add boundary box
		const boxGeometry = new THREE.BoxGeometry(
			this.grid.width,
			this.grid.height,
			this.grid.depth
		);
		const edges = new THREE.EdgesGeometry(boxGeometry);
		const lineMaterial = new THREE.LineBasicMaterial({ color: 0x555555 });
		const boundaryBox = new THREE.LineSegments(edges, lineMaterial);
		boundaryBox.position.set(
			this.grid.width / 2,
			this.grid.height / 2,
			this.grid.depth / 2
		);
		this.scene.add(boundaryBox);
	}

	private setupKeyboardListeners(): void {
		document.addEventListener('keydown', this.onKeyDown);
		document.addEventListener('keyup', this.onKeyUp);
	}

	private onKeyDown = (event: KeyboardEvent): void => {
		if (this._cameraMode !== 'firstperson') return;

		switch (event.code) {
			case 'KeyW':
				this.moveForward = true;
				break;
			case 'KeyS':
				this.moveBackward = true;
				break;
			case 'KeyA':
				this.moveLeft = true;
				break;
			case 'KeyD':
				this.moveRight = true;
				break;
			case 'Space':
				this.moveUp = true;
				event.preventDefault();
				break;
			case 'ShiftLeft':
			case 'ShiftRight':
				this.moveDown = true;
				break;
		}
	};

	private onKeyUp = (event: KeyboardEvent): void => {
		switch (event.code) {
			case 'KeyW':
				this.moveForward = false;
				break;
			case 'KeyS':
				this.moveBackward = false;
				break;
			case 'KeyA':
				this.moveLeft = false;
				break;
			case 'KeyD':
				this.moveRight = false;
				break;
			case 'Space':
				this.moveUp = false;
				break;
			case 'ShiftLeft':
			case 'ShiftRight':
				this.moveDown = false;
				break;
		}
	};

	private getPlayerBounds(x: number, y: number, z: number): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } {
		const halfWidth = this.playerWidth / 2;
		const footY = y - this.playerEyeHeight;
		return {
			minX: x - halfWidth,
			maxX: x + halfWidth,
			minY: footY,
			maxY: footY + this.playerHeight,
			minZ: z - halfWidth,
			maxZ: z + halfWidth
		};
	}

	private checkCollision(x: number, y: number, z: number): boolean {
		// Check if player box at position collides with any solid particles
		// (liquids and gases don't block the player)
		const bounds = this.getPlayerBounds(x, y, z);

		// Get cell range to check
		const minCellX = Math.floor(bounds.minX);
		const maxCellX = Math.floor(bounds.maxX);
		const minCellY = Math.floor(bounds.minY);
		const maxCellY = Math.floor(bounds.maxY);
		const minCellZ = Math.floor(bounds.minZ);
		const maxCellZ = Math.floor(bounds.maxZ);

		for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
			for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
				for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
					if (this.grid.isSolid(cellX, cellY, cellZ)) {
						// Check if player box actually overlaps this cell
						// Cell occupies [cellX, cellX+1] x [cellY, cellY+1] x [cellZ, cellZ+1]
						if (bounds.maxX > cellX && bounds.minX < cellX + 1 &&
							bounds.maxY > cellY && bounds.minY < cellY + 1 &&
							bounds.maxZ > cellZ && bounds.minZ < cellZ + 1) {
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	// Try to step up onto a block, returns the step height if successful, 0 if not
	private tryStepUp(x: number, y: number, z: number): number {
		// Try stepping up incrementally
		for (let step = 1; step <= this.maxStepHeight; step++) {
			if (!this.checkCollision(x, y + step, z)) {
				// Make sure there's ground to stand on at this height
				if (this.checkGrounded(x, y + step, z)) {
					return step;
				}
			}
		}
		return 0;
	}

	// Try to push player out of any blocks they're stuck in
	private pushOutOfBlocks(): void {
		const pos = this.camera.position;

		// If not stuck, nothing to do
		if (!this.checkCollision(pos.x, pos.y, pos.z)) {
			return;
		}

		// Try pushing up first (most common case - sand fell on player)
		for (let pushUp = 1; pushUp <= 20; pushUp++) {
			if (!this.checkCollision(pos.x, pos.y + pushUp, pos.z)) {
				pos.y += pushUp;
				this.velocity.y = 0;
				return;
			}
		}

		// Try pushing in horizontal directions
		const pushDirs = [
			{ x: 1, z: 0 }, { x: -1, z: 0 },
			{ x: 0, z: 1 }, { x: 0, z: -1 },
			{ x: 1, z: 1 }, { x: -1, z: 1 },
			{ x: 1, z: -1 }, { x: -1, z: -1 }
		];

		for (let dist = 1; dist <= 10; dist++) {
			for (const dir of pushDirs) {
				const newX = pos.x + dir.x * dist;
				const newZ = pos.z + dir.z * dist;
				if (!this.checkCollision(newX, pos.y, newZ)) {
					pos.x = newX;
					pos.z = newZ;
					return;
				}
				// Also try up + horizontal
				if (!this.checkCollision(newX, pos.y + dist, newZ)) {
					pos.x = newX;
					pos.y += dist;
					pos.z = newZ;
					this.velocity.y = 0;
					return;
				}
			}
		}
	}

	private checkGrounded(x: number, y: number, z: number): boolean {
		const bounds = this.getPlayerBounds(x, y, z);
		const footY = bounds.minY;

		// Check if at world floor
		if (footY <= this.skinWidth) {
			return true;
		}

		// Check cells directly below player's feet
		const groundY = Math.floor(footY - this.skinWidth);
		const minCellX = Math.floor(bounds.minX);
		const maxCellX = Math.floor(bounds.maxX);
		const minCellZ = Math.floor(bounds.minZ);
		const maxCellZ = Math.floor(bounds.maxZ);

		for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
			for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
				// Check horizontal overlap
				if (bounds.maxX > cellX && bounds.minX < cellX + 1 &&
					bounds.maxZ > cellZ && bounds.minZ < cellZ + 1) {
					if (this.grid.isSolid(cellX, groundY, cellZ)) {
						return true;
					}
				}
			}
		}

		return false;
	}

	private updateFirstPersonMovement(): void {
		const time = performance.now();
		const delta = Math.min((time - this.lastTime) / 1000, 0.1); // Cap delta to avoid huge jumps
		this.lastTime = time;

		const pos = this.camera.position;
		const halfWidth = this.playerWidth / 2;

		// If stuck inside blocks, push out first
		this.pushOutOfBlocks();

		// Apply gravity
		if (!this.isOnGround) {
			this.velocity.y -= this.gravity * delta;
		}

		// Jump
		if (this.moveUp && this.isOnGround) {
			this.velocity.y = this.jumpSpeed;
			this.isOnGround = false;
		}

		// Horizontal movement - get camera direction
		const forward = new THREE.Vector3();
		this.camera.getWorldDirection(forward);
		forward.y = 0;
		forward.normalize();

		const right = new THREE.Vector3();
		right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

		// Calculate movement direction
		this.direction.set(0, 0, 0);
		if (this.moveForward) this.direction.add(forward);
		if (this.moveBackward) this.direction.sub(forward);
		if (this.moveRight) this.direction.add(right);
		if (this.moveLeft) this.direction.sub(right);

		if (this.direction.length() > 0) {
			this.direction.normalize();
		}

		// Apply horizontal movement with step-up for slopes
		const moveX = this.direction.x * this.moveSpeed * delta;
		const moveZ = this.direction.z * this.moveSpeed * delta;

		// Try to move horizontally with collision detection and step-up
		if (moveX !== 0) {
			if (!this.checkCollision(pos.x + moveX, pos.y, pos.z)) {
				pos.x += moveX;
			} else if (this.isOnGround) {
				// Try stepping up
				const stepped = this.tryStepUp(pos.x + moveX, pos.y, pos.z);
				if (stepped > 0) {
					pos.x += moveX;
					pos.y += stepped;
				}
			}
		}
		if (moveZ !== 0) {
			if (!this.checkCollision(pos.x, pos.y, pos.z + moveZ)) {
				pos.z += moveZ;
			} else if (this.isOnGround) {
				// Try stepping up
				const stepped = this.tryStepUp(pos.x, pos.y, pos.z + moveZ);
				if (stepped > 0) {
					pos.z += moveZ;
					pos.y += stepped;
				}
			}
		}

		// Apply vertical movement
		const moveY = this.velocity.y * delta;
		const newY = pos.y + moveY;

		if (moveY < 0) {
			// Moving down - check for ground
			const footY = newY - this.playerEyeHeight;

			// Check world floor first
			if (footY <= 0) {
				pos.y = this.playerEyeHeight;
				this.velocity.y = 0;
				this.isOnGround = true;
			} else if (this.checkCollision(pos.x, newY, pos.z)) {
				// Hit a block - find the top of the block we landed on
				// Binary search to find exact landing position
				let high = pos.y;
				let low = newY;
				for (let i = 0; i < 8; i++) {
					const mid = (high + low) / 2;
					if (this.checkCollision(pos.x, mid, pos.z)) {
						low = mid;
					} else {
						high = mid;
					}
				}
				pos.y = high;
				this.velocity.y = 0;
				this.isOnGround = true;
			} else {
				pos.y = newY;
				this.isOnGround = this.checkGrounded(pos.x, pos.y, pos.z);
			}
		} else if (moveY > 0) {
			// Moving up - check for ceiling
			if (!this.checkCollision(pos.x, newY, pos.z)) {
				pos.y = newY;
			} else {
				// Hit ceiling
				this.velocity.y = 0;
			}
			this.isOnGround = false;
		} else {
			// Not moving vertically - check if still grounded
			this.isOnGround = this.checkGrounded(pos.x, pos.y, pos.z);

			// If not grounded, start falling
			if (!this.isOnGround) {
				this.velocity.y = -0.1; // Small initial downward velocity
			}
		}

		// Clamp to grid bounds
		pos.x = Math.max(halfWidth, Math.min(this.grid.width - halfWidth, pos.x));
		pos.y = Math.max(this.playerEyeHeight, Math.min(this.grid.height + 10, pos.y));
		pos.z = Math.max(halfWidth, Math.min(this.grid.depth - halfWidth, pos.z));
	}

	resize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	render(): void {
		this.frameCounter++;

		// Store camera state BEFORE controls update
		const prevCamX = this.camera.position.x;
		const prevCamY = this.camera.position.y;
		const prevCamZ = this.camera.position.z;
		const prevRotX = this.camera.rotation.x;
		const prevRotY = this.camera.rotation.y;

		// Update controls based on mode (must happen every frame for smooth input)
		if (this._cameraMode === 'orbit') {
			this.orbitControls.update();
		} else {
			this.updateFirstPersonMovement();
		}

		// Check if camera moved (compare to state BEFORE this frame's update)
		const cameraMoved =
			Math.abs(this.camera.position.x - prevCamX) > 0.001 ||
			Math.abs(this.camera.position.y - prevCamY) > 0.001 ||
			Math.abs(this.camera.position.z - prevCamZ) > 0.001 ||
			Math.abs(this.camera.rotation.x - prevRotX) > 0.001 ||
			Math.abs(this.camera.rotation.y - prevRotY) > 0.001;

		// Get all active particles (cached when simulation hasn't changed)
		const activeParticles = this.grid.getActiveParticles();

		// Check if particles changed
		const particlesChanged = activeParticles !== this.lastCacheRef ||
			activeParticles.length !== this.lastParticleCount;

		// Skip render if nothing changed and not every 60th frame
		const forceRender = this.frameCounter % 60 === 0;
		if (!particlesChanged && !cameraMoved && !forceRender) {
			return;
		}

		// Only update instances if particles changed
		if (particlesChanged) {
			this.lastCacheRef = activeParticles;
			this.lastParticleCount = activeParticles.length;

			// Update instance count
			this.instancedMesh.count = activeParticles.length;

			// Update transforms and colors
			for (let i = 0; i < activeParticles.length; i++) {
				const { x, y, z, particle } = activeParticles[i];

				// Set position
				this.dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
				this.dummy.updateMatrix();
				this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

				// Set color
				const r = ((particle.color >> 16) & 0xff) / 255;
				const g = ((particle.color >> 8) & 0xff) / 255;
				const b = (particle.color & 0xff) / 255;

				this.instancedMesh.instanceColor!.setXYZ(i, r, g, b);
			}

			// Mark for update
			this.instancedMesh.instanceMatrix.needsUpdate = true;
			if (this.instancedMesh.instanceColor) {
				this.instancedMesh.instanceColor.needsUpdate = true;
			}
		}

		const renderStart = performance.now();
		this.renderer.render(this.scene, this.camera);
		this.renderMsAccum += performance.now() - renderStart;
		this.renderFrameCount++;

		// Average render time every second
		const now = performance.now();
		if (now - this.lastStatsTime >= 1000) {
			if (this.renderFrameCount > 0) {
				this.lastRenderMs = this.renderMsAccum / this.renderFrameCount;
			}
			this.renderMsAccum = 0;
			this.renderFrameCount = 0;
			this.lastStatsTime = now;
		}
	}

	getRenderMs(): number {
		return Math.round(this.lastRenderMs * 100) / 100;
	}

	getCameraMode(): CameraMode {
		return this._cameraMode;
	}

	setCameraMode(mode: CameraMode): void {
		if (mode === this._cameraMode) return;

		this._cameraMode = mode;

		if (mode === 'firstperson') {
			// Disable orbit controls
			this.orbitControls.enabled = false;

			// Position camera inside the grid at eye level on the floor
			this.camera.position.set(
				this.grid.width / 2,
				this.playerEyeHeight,
				this.grid.depth / 2
			);
			this.camera.rotation.set(0, 0, 0);

			// Reset velocity and ground state
			this.velocity.set(0, 0, 0);
			this.isOnGround = true;

			// Lock pointer
			this.pointerLockControls.lock();
			this.lastTime = performance.now();

		} else {
			// Disable pointer lock
			this.pointerLockControls.unlock();

			// Reset velocity
			this.velocity.set(0, 0, 0);
			this.moveForward = false;
			this.moveBackward = false;
			this.moveLeft = false;
			this.moveRight = false;
			this.moveUp = false;
			this.moveDown = false;

			// Re-enable orbit controls
			this.orbitControls.enabled = true;

			// Reset to orbit view
			this.resetCamera();
		}

		this.onModeChange?.(mode);
	}

	toggleCameraMode(): CameraMode {
		const newMode = this._cameraMode === 'orbit' ? 'firstperson' : 'orbit';
		this.setCameraMode(newMode);
		return newMode;
	}

	isPointerLocked(): boolean {
		return this.pointerLockControls.isLocked;
	}

	getCamera(): THREE.PerspectiveCamera {
		return this.camera;
	}

	getScene(): THREE.Scene {
		return this.scene;
	}

	getRenderer(): THREE.WebGLRenderer {
		return this.renderer;
	}

	getOrbitControls(): OrbitControls {
		return this.orbitControls;
	}

	resetCamera(): void {
		const maxDim = Math.max(this.grid.width, this.grid.height, this.grid.depth);
		this.camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
		this.orbitControls.target.set(
			this.grid.width / 2,
			this.grid.height / 2,
			this.grid.depth / 2
		);
		this.orbitControls.update();
	}

	dispose(): void {
		document.removeEventListener('keydown', this.onKeyDown);
		document.removeEventListener('keyup', this.onKeyUp);
		this.orbitControls.dispose();
		this.pointerLockControls.dispose();
		this.renderer.dispose();
		this.instancedMesh.geometry.dispose();
		if (this.instancedMesh.material instanceof THREE.Material) {
			this.instancedMesh.material.dispose();
		}
	}
}
