import type { ParticleType } from '../simulation/particles';
import type { Engine } from '../simulation/Engine';
import type { CanvasRenderer } from '../rendering/CanvasRenderer';

export class InputHandler {
	private engine: Engine;
	private renderer: CanvasRenderer;
	private canvas: HTMLCanvasElement;
	private isDrawing: boolean = false;
	private lastX: number = -1;
	private lastY: number = -1;

	selectedElement: ParticleType = 'sand';
	brushSize: number = 3;

	constructor(canvas: HTMLCanvasElement, engine: Engine, renderer: CanvasRenderer) {
		this.canvas = canvas;
		this.engine = engine;
		this.renderer = renderer;
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		// Mouse events
		this.canvas.addEventListener('mousedown', this.handleMouseDown);
		this.canvas.addEventListener('mousemove', this.handleMouseMove);
		this.canvas.addEventListener('mouseup', this.handleMouseUp);
		this.canvas.addEventListener('mouseleave', this.handleMouseUp);

		// Touch events
		this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
		this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
		this.canvas.addEventListener('touchend', this.handleTouchEnd);
		this.canvas.addEventListener('touchcancel', this.handleTouchEnd);

		// Prevent context menu on canvas
		this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
	}

	private handleMouseDown = (e: MouseEvent): void => {
		this.isDrawing = true;
		const { x, y } = this.renderer.screenToGrid(e.clientX, e.clientY);
		this.draw(x, y);
		this.lastX = x;
		this.lastY = y;
	};

	private handleMouseMove = (e: MouseEvent): void => {
		if (!this.isDrawing) return;
		const { x, y } = this.renderer.screenToGrid(e.clientX, e.clientY);

		// Interpolate between last position and current for smooth drawing
		if (this.lastX >= 0 && this.lastY >= 0) {
			this.drawLine(this.lastX, this.lastY, x, y);
		} else {
			this.draw(x, y);
		}

		this.lastX = x;
		this.lastY = y;
	};

	private handleMouseUp = (): void => {
		this.isDrawing = false;
		this.lastX = -1;
		this.lastY = -1;
	};

	private handleTouchStart = (e: TouchEvent): void => {
		e.preventDefault();
		if (e.touches.length > 0) {
			const touch = e.touches[0];
			this.isDrawing = true;
			const { x, y } = this.renderer.screenToGrid(touch.clientX, touch.clientY);
			this.draw(x, y);
			this.lastX = x;
			this.lastY = y;
		}
	};

	private handleTouchMove = (e: TouchEvent): void => {
		e.preventDefault();
		if (!this.isDrawing || e.touches.length === 0) return;

		const touch = e.touches[0];
		const { x, y } = this.renderer.screenToGrid(touch.clientX, touch.clientY);

		if (this.lastX >= 0 && this.lastY >= 0) {
			this.drawLine(this.lastX, this.lastY, x, y);
		} else {
			this.draw(x, y);
		}

		this.lastX = x;
		this.lastY = y;
	};

	private handleTouchEnd = (): void => {
		this.isDrawing = false;
		this.lastX = -1;
		this.lastY = -1;
	};

	private draw(x: number, y: number): void {
		this.engine.addParticleInRadius(x, y, this.brushSize, this.selectedElement);
	}

	private drawLine(x0: number, y0: number, x1: number, y1: number): void {
		// Bresenham's line algorithm for smooth drawing
		const dx = Math.abs(x1 - x0);
		const dy = Math.abs(y1 - y0);
		const sx = x0 < x1 ? 1 : -1;
		const sy = y0 < y1 ? 1 : -1;
		let err = dx - dy;

		let x = x0;
		let y = y0;

		while (true) {
			this.draw(x, y);

			if (x === x1 && y === y1) break;

			const e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				x += sx;
			}
			if (e2 < dx) {
				err += dx;
				y += sy;
			}
		}
	}

	destroy(): void {
		this.canvas.removeEventListener('mousedown', this.handleMouseDown);
		this.canvas.removeEventListener('mousemove', this.handleMouseMove);
		this.canvas.removeEventListener('mouseup', this.handleMouseUp);
		this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
		this.canvas.removeEventListener('touchstart', this.handleTouchStart);
		this.canvas.removeEventListener('touchmove', this.handleTouchMove);
		this.canvas.removeEventListener('touchend', this.handleTouchEnd);
		this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
	}
}
