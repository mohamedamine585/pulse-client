import { Component, ElementRef, ViewChild, HostListener, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CanvasService, UserEvent, UserEventType, ConnectedUser } from '../../services/canvas.service';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', {static: true}) private canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer', {static: false}) private canvasContainer!: ElementRef;
  @ViewChild('canvasWrapper', {static: false}) private canvasWrapper!: ElementRef;

  canvasId: number = 1;
  isOnline: boolean = false;
  private ctx!: CanvasRenderingContext2D;
  private lastPoint: Point | null = null;
  
  // Drawing properties
  color: string = '#000000';
  cursorWidth: number = 5;
  drawing: boolean = false;
  activeColor: string = '#000000';
  
  // Pan & Zoom properties
  panX: number = 0;
  panY: number = 0;
  zoom: number = 1;
  isPanning: boolean = false;
  lastPanX: number = 0;
  lastPanY: number = 0;
  mouseX: number = 0;
  mouseY: number = 0;
  showCenterIndicator: boolean = false;
  showCoordinates: boolean = true;

  // Zoom constraints
  private minZoom: number = 0.2;
  private maxZoom: number = 3.0;
  private zoomSensitivity: number = 0.001;
  private zoomStep: number = 0.2;

  // Other properties
  loopAndUpdate = true;
  private sendInterval: any;
  private pixelBuffer: { positions: any[]; edits: any[] } = {positions: [], edits: []};
  totalPixelsSent: number = 0;

  // Canvas settings
  private readonly canvasWidth: number = 800;  
  private readonly canvasHeight: number = 600;
  private readonly defaultBackground: string = '#ffffff';

  // UI properties
  isMenuOpen = false;
  colors: string[] = [
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF'  // Magenta
  ];

  // Drawing properties
  private isDrawing = false;

  // Mode switching
  currentMode: 'draw' | 'pan' = 'draw';

  // Connected users and events
  connectedUsers: ConnectedUser[] = [];
  recentEvents: UserEvent[] = [];
  autoSaveEnabled: boolean = true;
  private autoSaveInterval: any;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private canvasService: CanvasService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      const idParam = params['canvasId'];
      if (idParam) {
        const parsedId = Number(idParam);
        if (!isNaN(parsedId)) {
          this.canvasId = parsedId;
          this.canvasService.connect(this.canvasId);
          this.canvasService.connectToEventFeed(this.canvasId);
          this.canvasService.connectToConnectedUsersFeed(this.canvasId);
          this.handleEventFeed();
          this.handleConnectedUsersFeed();
          this.updateOnlineStatus()

          setInterval(() => this.cleanupDisconnectedUsers(), 10000);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.startSendingPixels();
    this.updateCanvas();
    this.testEncodeDecode();
    this.centerCanvas();
  }

  private initializeCanvas(): void {
    // Set canvas dimensions
    this.canvas.nativeElement.width = this.canvasWidth;
    this.canvas.nativeElement.height = this.canvasHeight;
    
    // Use native HTML5 Canvas for drawing
    this.ctx = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true })!;
    
    // Set initial background
    this.ctx.fillStyle = this.defaultBackground;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    this.setupDrawingEvents();
  }

  private setupDrawingEvents(): void {
    const container = this.canvasContainer.nativeElement;
    
    container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
  }

  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    
    // Use middle mouse button or modifier key for panning
    if (event.button === 1 || event.ctrlKey || this.currentMode === 'pan') {
      this.startPan(event);
    } else if (event.button === 0) { // Left mouse button for drawing
      this.startDrawing(event);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    // Update mouse coordinates
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    // Always update panning if active
    if (this.isPanning) {
      this.onPan(event);
    }
    
    // Only draw if in draw mode and not panning
    if (this.currentMode === 'draw' && this.isDrawing && !this.isPanning) {
      this.continueDrawing(event);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.currentMode === 'pan') {
      this.stopPan();
    } else {
      this.stopDrawing();
    }
  }

  private handleMouseLeave(event: MouseEvent): void {
    this.stopDrawing();
    this.stopPan();
  }

  private handleWheel(event: WheelEvent): void {
    this.onZoom(event);
  }

  // Keyboard event listeners for better control
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ') { // Space bar for temporary panning
      this.canvasContainer.nativeElement.style.cursor = 'grab';
      this.currentMode = 'pan';
    } else if (event.ctrlKey) { // Ctrl for temporary panning
      this.canvasContainer.nativeElement.style.cursor = 'grab';
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (event.key === ' ') { // Release space bar
      this.canvasContainer.nativeElement.style.cursor = 'crosshair';
      this.currentMode = 'draw';
    } else if (!event.ctrlKey) { // Release Ctrl
      this.canvasContainer.nativeElement.style.cursor = this.currentMode === 'draw' ? 'crosshair' : 'grab';
    }
  }

  // Window resize handler
  @HostListener('window:resize')
  onResize(): void {
    this.centerCanvas();
  }
private startDrawing(event: MouseEvent): void {
  if (this.currentMode === 'pan' && !event.ctrlKey) return;
  
  this.isDrawing = true;
  this.drawing = true;
  
  const point = this.getCanvasCoordinates(event);
  if (!point) return;
  
  console.log('🖱️ START DRAWING at:', point);
  
  // Start a new path with proper styling
  this.ctx.beginPath();
  this.ctx.moveTo(point.x, point.y);
  this.ctx.strokeStyle = this.color;
  this.ctx.lineWidth = this.cursorWidth;
  this.ctx.lineCap = 'round';
  this.ctx.lineJoin = 'round';
  this.ctx.fillStyle = this.color;
  
  this.lastPoint = point;
  
  // Draw initial point AND capture it immediately
  this.ctx.arc(point.x, point.y, this.cursorWidth / 2, 0, Math.PI * 2);
  this.ctx.fill();
  
  // Capture the starting point
  this.captureDrawnPixels(point, point);
}
private continueDrawing(event: MouseEvent): void {
  if (!this.isDrawing || this.currentMode === 'pan') return;
  
  const point = this.getCanvasCoordinates(event);
  if (!point) return;
  
  // Always capture pixels if we have a lastPoint, regardless of distance
  if (this.lastPoint) {
    // Continue the path
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
    this.ctx.lineTo(point.x, point.y);
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.cursorWidth;
    this.ctx.stroke();
    
    // ALWAYS capture pixels - remove the distance check
    this.captureDrawnPixels(this.lastPoint, point);
  } else {
    // If no lastPoint, just draw a point and capture it
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.cursorWidth / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
    
    // Capture a single point
    this.captureDrawnPixels(point, point);
  }
  
  this.lastPoint = point;
}

  // FIXED COORDINATE TRANSFORMATION - This is the key fix
  private getCanvasCoordinates(event: MouseEvent): Point | null {
    const container = this.canvasContainer.nativeElement;
    const containerRect = container.getBoundingClientRect();
    
    // Get mouse position relative to container
    const containerX = event.clientX - containerRect.left;
    const containerY = event.clientY - containerRect.top;
    
    // Convert container coordinates to canvas coordinates
    // Remove the pan offset and divide by zoom to get actual canvas coordinates
    const canvasX = (containerX - this.panX) / this.zoom;
    const canvasY = (containerY - this.panY) / this.zoom;
    
    
    // Check if within canvas bounds with some tolerance
    const tolerance = 50;
    if (canvasX >= -tolerance && canvasX <= this.canvasWidth + tolerance && 
        canvasY >= -tolerance && canvasY <= this.canvasHeight + tolerance) {
      return { 
        x: Math.round(canvasX), 
        y: Math.round(canvasY) 
      };
    }
    
    return null;
  }

  // PAN & ZOOM METHODS
  private startPan(event: MouseEvent): void {
    if (event.button === 0 || event.button === 1) { // Left or middle mouse button
      this.isPanning = true;
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      
      // Change cursor to grabbing
      this.canvasContainer.nativeElement.style.cursor = 'grabbing';
    }
  }

  private onPan(event: MouseEvent): void {
    if (!this.isPanning) return;

    const deltaX = event.clientX - this.lastPanX;
    const deltaY = event.clientY - this.lastPanY;

    this.panX += deltaX;
    this.panY += deltaY;

    // Limit panning to keep canvas within view
    this.constrainPanning();

    this.lastPanX = event.clientX;
    this.lastPanY = event.clientY;
  }

  private constrainPanning(): void {
    const container = this.canvasContainer?.nativeElement;
    if (!container) return;

    const scaledWidth = this.canvasWidth * this.zoom;
    const scaledHeight = this.canvasHeight * this.zoom;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Only constrain if canvas is larger than container
    if (scaledWidth > containerWidth) {
      const maxPanX = scaledWidth - containerWidth;
      this.panX = Math.min(0, Math.max(-maxPanX, this.panX));
    } else {
      // Center horizontally if canvas is smaller
      this.panX = (containerWidth - scaledWidth) / 2;
    }

    if (scaledHeight > containerHeight) {
      const maxPanY = scaledHeight - containerHeight;
      this.panY = Math.min(0, Math.max(-maxPanY, this.panY));
    } else {
      // Center vertically if canvas is smaller
      this.panY = (containerHeight - scaledHeight) / 2;
    }
  }

  private stopPan(): void {
    this.isPanning = false;
    // Reset cursor based on current mode
    this.canvasContainer.nativeElement.style.cursor = this.currentMode === 'draw' ? 'crosshair' : 'grab';
  }

  private onZoom(event: WheelEvent): void {
    event.preventDefault();
    
    const delta = -event.deltaY * this.zoomSensitivity;
    const newZoom = this.zoom * (1 + delta);
    
    // Apply zoom constraints
    const constrainedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    
    if (constrainedZoom !== this.zoom) {
      const oldZoom = this.zoom;
      this.zoom = constrainedZoom;
      
      // Zoom towards mouse position
      this.zoomToPoint(event, oldZoom);
      
      // Constrain panning after zoom
      this.constrainPanning();
    }
  }

  private zoomToPoint(event: WheelEvent, oldZoom: number): void {
    const container = this.canvasContainer.nativeElement;
    const containerRect = container.getBoundingClientRect();
    
    // Mouse position relative to container
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;
    
    // Calculate the zoom factor
    const zoomFactor = this.zoom / oldZoom;
    
    // Adjust pan to zoom towards mouse position
    this.panX = mouseX - (mouseX - this.panX) * zoomFactor;
    this.panY = mouseY - (mouseY - this.panY) * zoomFactor;
  }

  // UI METHODS
  toggleMode(): void {
    this.currentMode = this.currentMode === 'draw' ? 'pan' : 'draw';
    
    // Update cursor
    this.canvasContainer.nativeElement.style.cursor = this.currentMode === 'draw' ? 'crosshair' : 'grab';
  }

  zoomIn(): void {
    const newZoom = this.zoom * (1 + this.zoomStep);
    this.zoom = Math.min(this.maxZoom, newZoom);
    this.constrainPanning();
  }

  zoomOut(): void {
    const newZoom = this.zoom / (1 + this.zoomStep);
    this.zoom = Math.max(this.minZoom, newZoom);
    this.constrainPanning();
  }

  resetView(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.centerCanvas();
  }

  centerCanvas(): void {
    const container = this.canvasContainer?.nativeElement;
    if (container) {
      const scaledWidth = this.canvasWidth * this.zoom;
      const scaledHeight = this.canvasHeight * this.zoom;
      
      // Center the canvas in the container
      this.panX = (container.clientWidth - scaledWidth) / 2;
      this.panY = (container.clientHeight - scaledHeight) / 2;
      
      // Ensure panning constraints are respected
      this.constrainPanning();
    }
  }

  changeColor(newColor: string): void {
    this.color = newColor;
    this.activeColor = newColor;
  }

  decreaseBrush(): void {
    if (this.cursorWidth > 1) {
      this.cursorWidth--;
    }
  }

  increaseBrush(): void {
    if (this.cursorWidth < 50) {
      this.cursorWidth++;
    }
  }

  clearCanvas(): void {
    this.ctx.fillStyle = this.defaultBackground;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  saveCanvas(): void {
    const dataURL = this.canvas.nativeElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'pulse-drawing.png';
    link.href = dataURL;
    link.click();
  }


  private calculateDrawBounds(from: Point, to: Point): {
    minX: number; maxX: number; minY: number; maxY: number; width: number; height: number;
  } {
    const padding = this.cursorWidth;
    const minX = Math.max(0, Math.min(from.x, to.x) - padding);
    const maxX = Math.min(this.canvasWidth, Math.max(from.x, to.x) + padding);
    const minY = Math.max(0, Math.min(from.y, to.y) - padding);
    const maxY = Math.min(this.canvasHeight, Math.max(from.y, to.y) + padding);

    return {
      minX, maxX, minY, maxY,
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY)
    };
  }

  private getDrawnAreaImageData(bounds: {
    minX: number; minY: number; width: number; height: number;
  }): ImageData {
    return this.ctx.getImageData(
      Math.max(0, bounds.minX),
      Math.max(0, bounds.minY),
      bounds.width,
      bounds.height
    );
  }

  private encodeRGBA(r: number, g: number, b: number, a: number): number {
    return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  }

  private decodeRGBA(rgba: number): { r: number, g: number, b: number, a: number } {
    rgba = this.normalizeInt(rgba);
    return {
      r: (rgba >> 24) & 0xff,
      g: (rgba >> 16) & 0xff,
      b: (rgba >> 8) & 0xff,
      a: rgba & 0xff
    };
  }

  private normalizeInt(value: number): number {
    return value >>> 0;
  }
private extractModifiedPixels(imageData: ImageData, bounds: {

  minX: number; minY: number; width: number; height: number;
}): { pixelsEdits: number[], pixelsPositions: number[] } {

  console.log("start extraction")
  const pixelsEdits: number[] = [];
  const pixelsPositions: number[] = [];
  const visited = new Set<number>();

  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      const i = (y * bounds.width + x) * 4;
      const alpha = imageData.data[i + 3];

      if (alpha > 0) { // Threshold to ignore nearly transparent pixels
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];

        const rgba = this.encodeRGBA(r, g, b, a);
        
        // Calculate actual canvas coordinates
        const actualX = Math.floor(bounds.minX + x);
        const actualY = Math.floor(bounds.minY + y);
        
        // Calculate position in the 1D pixel array
        const position = actualY * this.canvasWidth + actualX;
        
        // Validate position is within bounds
        if (position >= 0 && position < this.canvasWidth * this.canvasHeight) {
          if (!visited.has(position)) {
            visited.add(position);
            pixelsEdits.push(rgba);
            pixelsPositions.push(position);
          }
        }
      }
    }
  }

  console.log('📤 Extracted pixels:', {
    bounds: bounds,
    extracted: pixelsPositions.length,
    unique: visited.size
  });

  return { pixelsEdits, pixelsPositions };
}

  // ... rest of your methods (event handling, user management, etc.) remain the same
  getEventIcon(event: UserEvent): string {
    switch (event.userEventType) {
      case UserEventType.USER_JOINED:
        return 'fas fa-user-plus';
      case UserEventType.USER_LEFT:
        return 'fas fa-user-minus';
      default:
        return 'fas fa-circle';
    }
  }

  addConnectedUser(connectedUser: any) {
    if (!this.connectedUsers.find(u => u.userId === connectedUser.userId)) {
      this.connectedUsers.push(connectedUser);
    } else {
      const user = this.connectedUsers.find(u => u.userId === connectedUser.userId);
      if (user) {
        user.status = 'drawing';
      }
    }
  }

  private handleEventFeed() {
    this.canvasService.getEventFeed().subscribe(event => {
      if (event.userEventType === UserEventType.USER_LEFT) {
        const user = this.connectedUsers.find(u => u.userId === event.userId);
        if (user) {
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
      user = {
        ...user,
        color: this.getReadableHexColor(),
        status: 'drawing',
        initials: 'U' + user.userId.toString()
      };
      this.addConnectedUser(user);
    });
  }

  getReadableHexColor(): string {
    const r = Math.floor(Math.random() * 136);
    const g = Math.floor(Math.random() * 136);
    const b = Math.floor(Math.random() * 136);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  addEvent(event: UserEvent): void {
    if (!event) return;

    event.description = this.getUserEventDescription(event);
    event.fading = false;
    this.recentEvents.unshift(event);

    setTimeout(() => {
      event.fading = true;
    }, 5000);

    setTimeout(() => {
      this.recentEvents = this.recentEvents.filter(e => e !== event);
    }, 6000);
  }

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

  // Auto-save methods
  private startAutoSave() {
    if (this.autoSaveEnabled) {
      this.autoSaveInterval = setInterval(() => {
        this.saveCanvas();
      }, 30000);
    }
  }

  private stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  toggleAutoSave() {
    if (this.autoSaveEnabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  updateOnlineStatus(){
    this.canvasService.getOnlineStatus().subscribe(value =>{
      this.isOnline = value
    })
  }

  // Canvas service methods
  updateCanvas() {
    this.canvasService.getMessages().subscribe(data => {
      if (data.pixelsEdits && data.pixelsPositions) {
        this.applyEdits(data.pixelsEdits, data.pixelsPositions, data.lineWidth);
      }
    });
  }

private applyEdits(pixelsEdits: number[], pixelsPositions: number[], lineWidth: number): void {
  if (!pixelsEdits || !pixelsPositions || pixelsEdits.length === 0) return;

  const BATCH_SIZE = 100; // Process 100 pixels at a time
  const imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
  const data = imageData.data;

  // Process in batches to maintain line continuity
  for (let batchStart = 0; batchStart < pixelsPositions.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, pixelsPositions.length);
    
    // Apply this batch
    for (let i = batchStart; i < batchEnd; i++) {
      const pos = pixelsPositions[i];
      const rgba = this.decodeRGBA(pixelsEdits[i]);

      const pixelIndex = pos * 4;
      data[pixelIndex] = rgba.r;
      data[pixelIndex + 1] = rgba.g;
      data[pixelIndex + 2] = rgba.b;
      data[pixelIndex + 3] = rgba.a;
    }

    // Immediately render this batch to maintain visual continuity
    this.ctx.putImageData(imageData, 0, 0);
  }
}
// Add these properties to your class
private readonly BATCH_SIZE = 30;
private readonly MAX_SEND_RATE = 60; // 60 updates per second max
private lastSendTime: number = 0;
private sendTimeout: any = null;

// Replace your current methods with these:

private captureDrawnPixels(from: Point, to: Point): void {
  const bounds = this.calculateDrawBounds(from, to);
  const imageData = this.getDrawnAreaImageData(bounds);
  const { pixelsEdits, pixelsPositions } = this.extractModifiedPixels(imageData, bounds);
  
  this.pixelBuffer.positions.push(...pixelsPositions);
  this.pixelBuffer.edits.push(...pixelsEdits);

  // Use smart batching
  this.schedulePixelSend();
}

private schedulePixelSend(): void {
  if (this.sendTimeout) {
    clearTimeout(this.sendTimeout);
  }

  const currentTime = Date.now();
  const timeSinceLastSend = currentTime - this.lastSendTime;
  const minTimeBetweenSends = 1000 / this.MAX_SEND_RATE;

  // Send immediately if we have enough data or enough time has passed
  if (this.pixelBuffer.positions.length >= this.BATCH_SIZE || 
      timeSinceLastSend >= minTimeBetweenSends) {
    this.sendPixelBatch();
  } else {
    // Schedule for later
    const timeToWait = Math.max(1, minTimeBetweenSends - timeSinceLastSend);
    this.sendTimeout = setTimeout(() => {
      this.sendPixelBatch();
    }, timeToWait);
  }
}

private sendPixelBatch(): void {
  if (this.pixelBuffer.positions.length === 0) return;

  // Send the current batch
  console.log("SENT : ",this.pixelBuffer.positions.length)
  this.canvasService.sendPixelUpdates(this.pixelBuffer.positions, this.pixelBuffer.edits);
  this.totalPixelsSent += this.pixelBuffer.positions.length;
  
  // Clear the buffer
  this.pixelBuffer = { positions: [], edits: [] };
  this.lastSendTime = Date.now();
}

private stopDrawing(): void {
  if (!this.isDrawing) return;
  
  this.isDrawing = false;
  this.drawing = false;
  this.lastPoint = null;

  // Send any remaining pixels immediately
  if (this.pixelBuffer.positions.length > 0) {
    this.sendPixelBatch();
  }
}

private startSendingPixels(): void {
  // No interval needed - the scheduler handles timing
  // This method can be empty or removed if not used elsewhere
}

// Update ngOnDestroy
ngOnDestroy() {
  if (this.sendTimeout) {
    clearTimeout(this.sendTimeout);
  }
  clearInterval(this.sendInterval);
  this.canvasService.disconnect(true);
  this.stopAutoSave();
}



  private testEncodeDecode(): void {
    const testRGBA = { r: 255, g: 128, b: 64, a: 255 };
    const encoded = this.encodeRGBA(testRGBA.r, testRGBA.g, testRGBA.b, testRGBA.a);
    const decoded = this.decodeRGBA(encoded);

    if (
      decoded.r === testRGBA.r &&
      decoded.g === testRGBA.g &&
      decoded.b === testRGBA.b &&
      decoded.a === testRGBA.a
    ) {
      console.log('Encode/decode test passed');
    } else {
      console.error('Encode/decode test failed');
    }
  }
// Add this property
showUsersPanel: boolean = false;

// Add these methods
toggleUsersPanel(): void {
  this.showUsersPanel = !this.showUsersPanel;
}

hideUsersPanel(): void {
  this.showUsersPanel = false;
}

// Close panel when clicking outside
@HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent): void {
  if (this.showUsersPanel) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-count-container')) {
      this.hideUsersPanel();
    }
  }
}
}