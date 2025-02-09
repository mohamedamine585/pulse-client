import { Component, ElementRef, ViewChild, HostListener, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';

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
  private ctx!: CanvasRenderingContext2D;
  private lastPoint: Point | null = null;
  
  color: string = '#000000';
  cursorWidth: number = 5;
  drawing: boolean = false;
  activeColor: string = '#000000';
  
  // Canvas settings
  private readonly maxWidth: number = 1920;
  private readonly maxHeight: number = 1080;
  private readonly defaultBackground: string = '#ffffff';

  isMenuOpen = false;
  colors: string[] = [
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF'  // Magenta
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startAutoSave();

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
  }

  private initializeCanvas(): void {
    const canvas = this.canvas.nativeElement;
    
    // Set canvas size with max limits
    canvas.width = Math.min(window.innerWidth * 0.8, this.maxWidth);
    canvas.height = Math.min(window.innerHeight * 0.6, this.maxHeight);
    
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
    if (!this.drawing || !this.ctx) return;

    const currentPoint = this.getMousePosition(event);
    
    if (this.lastPoint) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
      this.ctx.lineTo(currentPoint.x, currentPoint.y);
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.cursorWidth;
      this.ctx.stroke();
    }

    this.lastPoint = currentPoint;
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
 //   link.click();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.initializeCanvas();
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
