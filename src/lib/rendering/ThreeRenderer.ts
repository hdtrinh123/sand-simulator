import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Grid } from '../simulation/Grid';

export class ThreeRenderer {
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private controls: OrbitControls;
	private grid: Grid;

	private instancedMesh: THREE.InstancedMesh;
	private maxInstances: number;
	private dummy: THREE.Object3D;
	private colorAttribute: THREE.InstancedBufferAttribute;

	private bgColor: number = 0x1a1a2e;

	constructor(canvas: HTMLCanvasElement, grid: Grid) {
		this.grid = grid;
		this.maxInstances = grid.width * grid.height * grid.depth;

		// Scene setup
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(this.bgColor);

		// Camera setup
		const aspect = canvas.clientWidth / canvas.clientHeight;
		this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);

		// Position camera to see the whole grid
		const maxDim = Math.max(grid.width, grid.height, grid.depth);
		this.camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
		this.camera.lookAt(grid.width / 2, grid.height / 2, grid.depth / 2);

		// Renderer setup
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			powerPreference: 'high-performance'
		});
		this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Orbit controls
		this.controls = new OrbitControls(this.camera, canvas);
		this.controls.target.set(grid.width / 2, grid.height / 2, grid.depth / 2);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.update();

		// Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(maxDim, maxDim * 2, maxDim);
		this.scene.add(directionalLight);

		// Create instanced mesh for voxels
		const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95); // Slightly smaller for gaps
		const material = new THREE.MeshLambertMaterial({ vertexColors: true });

		this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
		this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.instancedMesh.count = 0; // Start with no visible instances

		// Create color attribute for per-instance colors
		const colors = new Float32Array(this.maxInstances * 3);
		this.colorAttribute = new THREE.InstancedBufferAttribute(colors, 3);
		this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
		geometry.setAttribute('color', this.colorAttribute);

		// Override material to use instance colors
		this.instancedMesh.material = new THREE.MeshLambertMaterial({
			vertexColors: false
		});

		// We'll set colors via instanceColor
		this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
			new Float32Array(this.maxInstances * 3),
			3
		);
		this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

		this.scene.add(this.instancedMesh);

		this.dummy = new THREE.Object3D();

		// Add a simple floor grid for reference
		this.addFloorGrid();
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

	resize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	render(): void {
		// Get all active particles
		const activeParticles = this.grid.getActiveParticles();

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

		// Update controls and render
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
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

	getControls(): OrbitControls {
		return this.controls;
	}

	resetCamera(): void {
		const maxDim = Math.max(this.grid.width, this.grid.height, this.grid.depth);
		this.camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
		this.controls.target.set(
			this.grid.width / 2,
			this.grid.height / 2,
			this.grid.depth / 2
		);
		this.controls.update();
	}

	dispose(): void {
		this.controls.dispose();
		this.renderer.dispose();
		this.instancedMesh.geometry.dispose();
		if (this.instancedMesh.material instanceof THREE.Material) {
			this.instancedMesh.material.dispose();
		}
	}
}
