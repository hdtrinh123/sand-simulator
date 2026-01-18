import type { Grid } from '../simulation/Grid';

export class CanvasRenderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private imageData: ImageData;
	private grid: Grid;
	private scale: number;
	private bgColor: number = 0x1a1a2e;

	constructor(canvas: HTMLCanvasElement, grid: Grid, scale: number = 2) {
		this.canvas = canvas;
		this.grid = grid;
		this.scale = scale;

		const ctx = canvas.getContext('2d', { alpha: false });
		if (!ctx) throw new Error('Could not get 2d context');
		this.ctx = ctx;

		// Disable image smoothing for crisp pixels
		this.ctx.imageSmoothingEnabled = false;

		// Set canvas size
		this.resize();

		// Create ImageData for efficient pixel manipulation
		this.imageData = this.ctx.createImageData(grid.width, grid.height);
	}

	resize(): void {
		this.canvas.width = this.grid.width * this.scale;
		this.canvas.height = this.grid.height * this.scale;
		this.ctx.imageSmoothingEnabled = false;
	}

	setScale(scale: number): void {
		this.scale = scale;
		this.resize();
	}

	getScale(): number {
		return this.scale;
	}

	render(): void {
		const cells = this.grid.getCells();
		const data = this.imageData.data;

		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];
			const pixelIndex = i * 4;

			if (cell && cell.type !== 'empty') {
				const color = cell.color;
				data[pixelIndex] = (color >> 16) & 0xff;     // R
				data[pixelIndex + 1] = (color >> 8) & 0xff;  // G
				data[pixelIndex + 2] = color & 0xff;         // B
				data[pixelIndex + 3] = 255;                   // A
			} else {
				// Background color
				data[pixelIndex] = (this.bgColor >> 16) & 0xff;
				data[pixelIndex + 1] = (this.bgColor >> 8) & 0xff;
				data[pixelIndex + 2] = this.bgColor & 0xff;
				data[pixelIndex + 3] = 255;
			}
		}

		// Draw at 1:1 scale first
		this.ctx.putImageData(this.imageData, 0, 0);

		// Scale up if needed
		if (this.scale > 1) {
			// Create a temporary canvas to hold the 1:1 image
			const tempCanvas = document.createElement('canvas');
			tempCanvas.width = this.grid.width;
			tempCanvas.height = this.grid.height;
			const tempCtx = tempCanvas.getContext('2d')!;
			tempCtx.putImageData(this.imageData, 0, 0);

			// Clear and scale
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.drawImage(
				tempCanvas,
				0, 0, this.grid.width, this.grid.height,
				0, 0, this.canvas.width, this.canvas.height
			);
		}
	}

	screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();
		const x = Math.floor((screenX - rect.left) / this.scale);
		const y = Math.floor((screenY - rect.top) / this.scale);
		return { x, y };
	}
}
