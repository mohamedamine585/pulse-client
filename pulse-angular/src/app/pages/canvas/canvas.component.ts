import { Component, ElementRef, ViewChild, HostListener, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CanvasService } from '../../services/canvas.service';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas', { static: true }) private canvas!: ElementRef<HTMLCanvasElement>;

  private canvasId : bigint = 1n;
  private ctx!: CanvasRenderingContext2D;
  private lastPoint: Point | null = null;
  
  color: string = '#000000';
  cursorWidth: number = 5;
  drawing: boolean = false;
  activeColor: string = '#000000';
  
  // Canvas settings

  private readonly defaultBackground: string = '#ffffff';
  private readonly canvasWidth: number = 800; // Fixed width
  private readonly canvasHeight: number = 600; // Fixed height

  isMenuOpen = false;
  colors: string[] = [
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF'  // Magenta
  ];

  constructor(private router: Router,
    private activatedRoute : ActivatedRoute,
    private canvasService : CanvasService) {}

  ngOnInit(): void {
    this.startAutoSave();
    this.canvasService.connect(this.canvasId.toString());

  }
  
  private generateRandomEdits(pixelsEds: any, pixelsPos: any): void {
    const pixelsEdits: number[] = pixelsEds ?? [];
    const pixelsPositions: number[] = pixelsPos ?? [];

    // Define a small range near (0, 0), e.g., 50x50 pixels
    const range = 50; // You can adjust this range

    // Generate 10,000 random pixel edits near (0, 0)
    for (let i = 0; i < 10000; i++) {
        const x = Math.floor(Math.random() * range);  // Limit x to range
        const y = Math.floor(Math.random() * range);  // Limit y to range
        const pixelIndex = (y * this.canvasWidth + x) * 4;

        // Generate random RGB values (A is always 255)
        pixelsEdits.push(
            Math.floor(Math.random() * 256),  // R
            Math.floor(Math.random() * 256),  // G
            Math.floor(Math.random() * 256),  // B
            255                               // A (fully opaque)
        );

        // Store the position where this pixel's RGBA values should go
        pixelsPositions.push(pixelIndex);
    }

    // Apply edits to the canvas
    this.applyEdits(pixelsEdits, pixelsPositions);
}


private applyEdits(pixelsEdits: number[], pixelsPositions: number[]): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    const data = imageData.data;

    // Apply each edit to the correct position
    for (let i = 0; i < pixelsPositions.length; i++) {
        const pos = pixelsPositions[i];
        data[pos] = pixelsEdits[i * 4];       // R
        data[pos + 1] = pixelsEdits[i * 4 + 1]; // G
        data[pos + 2] = pixelsEdits[i * 4 + 2]; // B
        data[pos + 3] = pixelsEdits[i * 4 + 3]; // A
    }

    // Update the canvas with the modified pixel data
    this.ctx.putImageData(imageData, 0, 0);

    console.log('Edits applied:', {
        totalEdits: pixelsPositions.length,
        firstEdit: {
            position: pixelsPositions[0],
            color: pixelsEdits.slice(0, 4)
        }
    });
}



  ngAfterViewInit(): void {
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('Canvas 2D context not supported');
      return;
    }
    
    this.ctx = context;
    this.initializeCanvas();
    
    // Move generateRandomEdits here, after canvas is initialized
    this.generateRandomEdits(null,null);
  }

  private initializeCanvas(): void {
    const canvas = this.canvas.nativeElement;
    
    // Set fixed canvas size
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    
    // Set initial canvas state
    this.ctx.fillStyle = this.defaultBackground;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  changeColor(newColor: string): void {
    this.color = newColor;
    this.activeColor = newColor;
    if (this.ctx) {
      this.ctx.strokeStyle = newColor;
    }
  }

  changeBrushWidth(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newWidth = parseInt(target.value);
    this.cursorWidth = Math.max(1, Math.min(newWidth, 50)); // Limit brush size
    if (this.ctx) {
      this.ctx.lineWidth = this.cursorWidth;
    }
  }

  private startDrawing(event: MouseEvent): void {
    this.drawing = true;
    this.lastPoint = this.getMousePosition(event);
    this.draw(event);
  }

  private draw(event: MouseEvent): void {
    if (!this.canDraw(event)) return;
    
    const currentPoint = this.getMousePosition(event);
    if (this.lastPoint) {
        this.drawLine(this.lastPoint, currentPoint);
        this.captureDrawnPixels(this.lastPoint, currentPoint);
    }

    this.lastPoint = currentPoint;
    this.showPixelData();
}

private canDraw(event: MouseEvent): boolean {
    if (!this.drawing || !this.ctx) return false;
    const point = this.getMousePosition(event);
    return this.isPointInCanvas(point);
}

private drawLine(from: Point, to: Point): void {
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.cursorWidth;
    this.ctx.stroke();
}

private captureDrawnPixels(from: Point, to: Point): void {
    const bounds = this.calculateDrawBounds(from, to);
    const imageData = this.getDrawnAreaImageData(bounds);
    const { pixelsEdits, pixelsPositions } = this.extractModifiedPixels(imageData, bounds);
    
    console.log({ pixelsEdits, pixelsPositions });
}

private calculateDrawBounds(from: Point, to: Point): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
} {
    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);
    
    return {
        minX,
        maxX,
        minY,
        maxY,
        width: Math.ceil(maxX - minX + this.cursorWidth),
        height: Math.ceil(maxY - minY + this.cursorWidth)
    };
}

private getDrawnAreaImageData(bounds: {
    minX: number;
    minY: number;
    width: number;
    height: number;
}): ImageData {
    return this.ctx.getImageData(
        Math.max(0, bounds.minX - this.cursorWidth),
        Math.max(0, bounds.minY - this.cursorWidth),
        bounds.width,
        bounds.height
    );
}

private extractModifiedPixels(imageData: ImageData, bounds: {
    minX: number;
    minY: number;
    width: number;
    height: number;
}): { pixelsEdits: number[], pixelsPositions: number[] } {
    const pixelsEdits: number[] = [];
    const pixelsPositions: number[] = [];

    for (let y = 0; y < bounds.height; y++) {
        for (let x = 0; x < bounds.width; x++) {
            const i = (y * bounds.width + x) * 4;
            if (imageData.data[i + 3] > 0) { // If pixel is not transparent
                // Store RGBA values
                pixelsEdits.push(
                    imageData.data[i],     // R
                    imageData.data[i + 1], // G
                    imageData.data[i + 2], // B
                    imageData.data[i + 3]  // A
                );

                // Calculate actual position in full canvas array
                const actualX = Math.floor(Math.max(0, bounds.minX - this.cursorWidth) + x);
                const actualY = Math.floor(Math.max(0, bounds.minY - this.cursorWidth) + y);
                const basePosition = actualY * this.canvasWidth + actualX;
                
                // Store individual positions for R,G,B,A
                pixelsPositions.push(
                    basePosition,     // Position for R
                    basePosition + 1, // Position for G
                    basePosition + 2, // Position for B
                    basePosition + 3  // Position for A
                );
            }
        }
    }

    return { pixelsEdits, pixelsPositions };
}

  private isPointInCanvas(point: Point): boolean {
    return point.x >= 0 && point.x <= this.canvasWidth && 
           point.y >= 0 && point.y <= this.canvasHeight;
  }

  private showPixelData(): void {
    // Get pixel data as Uint8ClampedArray
    const imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    const pixels = imageData.data;
    
    // Convert to matrix format (RGBA values)
    const matrix: number[][][] = [];
    for (let y = 0; y < this.canvasHeight; y++) {
      const row: number[][] = [];
      for (let x = 0; x < this.canvasWidth; x++) {
        const i = (y * this.canvasWidth + x) * 4;
        row.push([
          pixels[i],     // R
          pixels[i + 1], // G
          pixels[i + 2], // B
          pixels[i + 3]  // A
        ]);
      }
      matrix.push(row);
    }

  }

  getNonBlackNonWhitePixels(imageData: ImageData) {
    const data = imageData.data;
    const width = this.canvasWidth;
    const nonBlackNonWhitePixels = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];     // Red channel
      const g = data[i + 1]; // Green channel
      const b = data[i + 2]; // Blue channel
      const a = data[i + 3]; // Alpha channel

      // Check if pixel is not black AND not white
      const isBlack = (r === 0 && g === 0 && b === 0 && a === 255);
      const isWhite = (r === 255 && g === 255 && b === 255 && a === 255);
      
      if (!isBlack && !isWhite) {
        nonBlackNonWhitePixels.push({ 
          r, g, b, a, 
          x: (i / 4) % width, 
          y: Math.floor((i / 4) / width) 
        });
      }
    }

    console.log('Non-black and non-white pixels:', nonBlackNonWhitePixels);
    return nonBlackNonWhitePixels;
  }

  private countNonWhitePixels(pixels: Uint8ClampedArray): number {
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (!(pixels[i] === 255 && pixels[i + 1] === 255 && 
            pixels[i + 2] === 255 && pixels[i + 3] === 255)) {
        count++;
      }
    }
    return count;
  }

  private stopDrawing(): void {
    this.drawing = false;
    this.lastPoint = null;
  }
   
  
  private getMousePosition(event: MouseEvent): Point {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const scaleX = this.canvas.nativeElement.width / rect.width;
    const scaleY = this.canvas.nativeElement.height / rect.height;
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }
  // Clear canvas
  clearCanvas(): void {
    if (this.ctx) {
      this.ctx.fillStyle = this.defaultBackground;
      this.ctx.fillRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    }
  }

  // Save canvas as image
  saveCanvas(): void {
    const link = document.createElement('a');
    link.download = 'pulse-drawing.png';
    link.href = this.canvas.nativeElement.toDataURL();
   // link.click();
  }



  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.startDrawing(event);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.draw(event);
  }

  @HostListener('mouseup')
  onMouseUp(): void {
    this.stopDrawing();
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.stopDrawing();
  }

  autoSaveEnabled: boolean = true;
  private autoSaveInterval: any;



  ngOnDestroy() {
    this.stopAutoSave();
  }

  toggleAutoSave() {
    if (this.autoSaveEnabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  private startAutoSave() {
    if (this.autoSaveEnabled) {
      this.autoSaveInterval = setInterval(() => {
        this.saveCanvas();
      }, 30000); // Auto save every 30 seconds
    }
  }

  private stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

}











