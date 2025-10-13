import { Component, ElementRef, ViewChild, HostListener, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import {ActivatedRoute, EventType, Router} from '@angular/router';
import {CanvasService, UserEvent, UserEventType, Event, ConnectedUser} from '../../services/canvas.service';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit, AfterViewInit,OnDestroy {
  @ViewChild('canvas', {static: true}) private canvas!: ElementRef<HTMLCanvasElement>;

  private canvasId: number = 1;
  private ctx!: CanvasRenderingContext2D;
  private lastPoint: Point | null = null;
  loopAndUpdate = true;
  color: string = '#000000';
  cursorWidth: number = 5;
  drawing: boolean = false;
  activeColor: string = '#000000';
  private sendInterval: any;
  private pixelBuffer: { positions: any[]; edits: any[] } = {positions: [], edits: []};

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
              private activatedRoute: ActivatedRoute,
              private canvasService: CanvasService) {

  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      const idParam = params['canvasId'];

      if (idParam) {
        const parsedId = Number(idParam);
        if (!isNaN(parsedId)) {
          this.canvasId = parsedId;

          // Connect to canvas and start auto-save only if valid ID
          this.startAutoSave();
          this.canvasService.connect(this.canvasId);
          this.canvasService.connectToEventFeed(this.canvasId);
          this.canvasService.connectToConnectedUsersFeed(this.canvasId);
          this.handleEventFeed();
          this.handleConnectedUsersFeed();

          // Periodically clean up disconnected users
          setInterval(() => this.cleanupDisconnectedUsers(), 10000); // Every 60 seconds
        } else {
          console.error('Invalid canvas ID:', idParam);
        }
      } else {
        console.warn('No canvas ID in query params');
      }
    });
  }

  addConnectedUser(ConnectedUser: any) {
    // Avoid duplicates
    if (!this.connectedUsers.find(u => u.userId === ConnectedUser.userId)) {
      this.connectedUsers.push(ConnectedUser);
    }else {
      const user = this.connectedUsers.find(u => u.userId === ConnectedUser.userId);
      if(user){
        user.status = 'drawing';
      }
    }
  }
  private handleEventFeed() {
    this.canvasService.getEventFeed().subscribe(event => {
      if(event.userEventType === UserEventType.USER_LEFT){
        const user = this.connectedUsers.find(u => u.userId === event.userId);
        if(user){
          user.status = 'idle';
        }

        this.addEvent(event);

      }
    });
  }

  cleanupDisconnectedUsers() {
      this.connectedUsers = this.connectedUsers.filter(user => user.status !== 'idle');

  }
  private handleConnectedUsersFeed() {
    this.canvasService.getConnectedUsersFeed().subscribe(user => {
      user = {...user
        ,color: this.getReadableHexColor(),
         status:'drawing',
        initials: 'U'+ user.userId.toString()
      }
      this.addConnectedUser(user);
    });
  }
   getReadableHexColor(): string {
    const r = Math.floor(Math.random() * 136);
    const g = Math.floor(Math.random() * 136);
    const b = Math.floor(Math.random() * 136);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  updateCanvas() {
    this.canvasService.getMessages().subscribe(data => {
      if (data.pixelsEdits && data.pixelsPositions) {

        this.applyEdits(data.pixelsEdits, data.pixelsPositions, data.lineWidth)
      }

    })
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


    let blankedits: number[] = new Array(pixelsPositions.length).fill(255);

    // Apply edits to the canvas
    this.applyEdits(blankedits, pixelsPositions, this.ctx.lineWidth);
  }

  private applyEdits(pixelsEdits: number[], pixelsPositions: number[], lineWidth: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    const data = imageData.data;
    this.ctx.lineWidth = lineWidth;

    for (let i = 0; i < pixelsPositions.length; i++) {
      const pos = pixelsPositions[i] * 4; // Convert position to pixel index
      const rgba = this.decodeRGBA(pixelsEdits[i]); // Decode RGBA

      // Apply the decoded RGBA values
      data[pos] = rgba.r;       // R
      data[pos + 1] = rgba.g;   // G
      data[pos + 2] = rgba.b;   // B
      data[pos + 3] = rgba.a;   // A

    }

    // Update the canvas with the modified pixel data
    this.ctx.putImageData(imageData, 0, 0);
  }


  ngAfterViewInit(): void {
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d', {willReadFrequently: true}); // Enable willReadFrequently

    if (!context) {
      console.error('Canvas 2D context not supported');
      return;
    }

    this.ctx = context;
    this.initializeCanvas();
    this.startSendingPixels();
    this.updateCanvas();
    this.testEncodeDecode()

  }

  private initializeCanvas(): void {
    const canvas = this.canvas.nativeElement;

    // Set fixed canvas size
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;

    // Set initial canvas state
    this.ctx.fillStyle = this.defaultBackground;
    this.ctx.fillRect(0, 0, canvas.width * 0.1, canvas.height * 0.1);
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

    if (this.pixelBuffer.positions.length > 0) {
      // Send pixel updates to the backend
      console.log("SENT UPDATE ", this.pixelBuffer.edits.length)
      this.canvasService.sendPixelUpdates(this.pixelBuffer.positions, this.pixelBuffer.edits);

      // Reset the buffer
      this.pixelBuffer = {positions: [], edits: []};
    }
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


  private startSendingPixels(): void {
    this.sendInterval = setInterval(() => {
      if (this.pixelBuffer.positions.length > 0) {
        // Send pixel updates to the backend
        this.canvasService.sendPixelUpdates(this.pixelBuffer.positions, this.pixelBuffer.edits);

        // Reset the buffer
        this.pixelBuffer = {positions: [], edits: []};
      }
    }, 50); // Send updates every 50 ms
  }

  private captureDrawnPixels(from: Point, to: Point): void {
    // Calculate the bounds of the drawn area (including cursor width for more precision)
    const bounds = this.calculateDrawBounds(from, to);

    // Get the image data for the drawn area
    const imageData = this.getDrawnAreaImageData(bounds);

    // Extract modified pixels (non-transparent pixels)
    const {pixelsEdits, pixelsPositions} = this.extractModifiedPixels(imageData, bounds);

    // Store pixels in the buffer
    this.pixelBuffer.positions.push(...pixelsPositions);
    this.pixelBuffer.edits.push(...pixelsEdits);
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

    // Adjust bounds to match the line drawn more closely (keep cursor width *1.5 buffer for precision)
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.ceil(maxX - minX + this.cursorWidth * 1.5),
      height: Math.ceil(maxY - minY + this.cursorWidth * 1.5)
    };
  }

  private getDrawnAreaImageData(bounds: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  }): ImageData {
    return this.ctx.getImageData(
      Math.max(0, bounds.minX - this.cursorWidth),  // Adjust for alignment
      Math.max(0, bounds.minY - this.cursorWidth),  // Adjust for alignment
      bounds.width,
      bounds.height
    );
  }
  private encodeRGBA(r: number, g: number, b: number, a: number): number {
    return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0; // Ensure unsigned 32-bit integer
  }

  private decodeRGBA(rgba: number): { r: number, g: number, b: number, a: number } {
    rgba = this.normalizeInt(rgba);
    return {
      r: (rgba >> 24) & 0xff, // Extract R
      g: (rgba >> 16) & 0xff, // Extract G
      b: (rgba >> 8) & 0xff,  // Extract B
      a: rgba & 0xff          // Extract A
    };
  }

  private normalizeInt(value: number): number {
    return value >>> 0;
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
        const i = (y * bounds.width + x) * 4; // Index in the ImageData array
        const alpha = imageData.data[i + 3]; // Alpha channel value

        // Only process non-transparent pixels (alpha > 0)
        if (alpha > 0) {
          const r = imageData.data[i];     // Red channel
          const g = imageData.data[i + 1]; // Green channel
          const b = imageData.data[i + 2]; // Blue channel
          const a = imageData.data[i + 3]; // Alpha channel

          // Encode RGBA into a single 32-bit integer
          const rgba = this.encodeRGBA(r, g, b, a);

          // Calculate the actual position in the full canvas array
          const actualX = Math.floor(bounds.minX + x) - 1;
          const actualY = Math.floor(bounds.minY + y) - 1;
          const basePosition = actualY * this.canvasWidth + actualX;

          // Store the encoded RGBA value and position
          pixelsEdits.push(rgba);

          pixelsPositions.push(basePosition);
        }
      }
    }

    return {pixelsEdits, pixelsPositions};
  }

  private testEncodeDecode(): void {
    const testRGBA = {r: 255, g: 128, b: 64, a: 255};
    const encoded = this.encodeRGBA(testRGBA.r, testRGBA.g, testRGBA.b, testRGBA.a);
    const decoded = this.decodeRGBA(encoded);

    if (
      decoded.r === testRGBA.r &&
      decoded.g === testRGBA.g &&
      decoded.b === testRGBA.b &&
      decoded.a === testRGBA.a
    ) {
    } else {
    }
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
    clearInterval(this.sendInterval);
    this.canvasService.disconnect(true);
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

  connectedUsers: ConnectedUser[] = [ ];


  recentEvents: UserEvent[] = [];

  addEvent(event: UserEvent): void {
    // Assign timestamp if missing

    if (!event) {
      return;
    }


    // Create UI-friendly description
    event.description = this.getUserEventDescription(event);

    // Add fading flag
    event.fading = false;

    // Add to top of list
    this.recentEvents.unshift(event);

    // Fade out after 5 seconds
    setTimeout(() => {
      event.fading = true;
    }, 5000);

    // Remove completely after 6 seconds
    setTimeout(() => {
      this.recentEvents = this.recentEvents.filter(e => e !== event);
    }, 6000);
  }

// Helper function to generate description
  private getUserEventDescription(event: UserEvent): string {
    switch (event.userEventType) {
      case UserEventType.USER_JOINED:
        return `User ${event.userId} joined the canvas`;
      case UserEventType.USER_LEFT:
        return `User ${event.userId} left the canvas`;
      default:
        return `User ${event.userId} performed an action`;
    }
  }

}











