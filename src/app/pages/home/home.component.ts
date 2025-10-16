import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { interval, Subscription, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { CanvasService } from '../../services/canvas.service';
import { AuthService } from '../../services/auth.service';
import { CanvasDialogComponent } from '../canvas-dialog/canvas-dialog/canvas-dialog.component';
import { Canvas } from '../../models/canvas';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  searchQuery = '';
  dropdownOpen = false;
  canvases: Canvas[] = [];

  private refreshSub?: Subscription;
  private participantsSubs = new Map<number, Subscription>(); // active WS feeds

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
    private canvasService: CanvasService
  ) {}

  ngOnInit(): void {
    this.loadCanvases();

    // 🔁 Auto-refresh canvases every 10s
    this.refreshSub = interval(10000)
      .pipe(
        switchMap(() => this.canvasService.getAllCanvases()),
        catchError(err => {
          console.error('Error refreshing canvases:', err);
          return of({ content: this.canvases });
        })
      )
      .subscribe(response => this.updateCanvases(response.content || []));
  }

  ngOnDestroy(): void {
    // 🧹 Cleanup all subscriptions & sockets
    this.refreshSub?.unsubscribe();

    this.participantsSubs.forEach(sub => sub.unsubscribe());
    this.participantsSubs.clear();

    this.canvasService.disconnectAllParticipantsFeeds(); // ✅ Ensures WS cleanup
  }

  /** Load all canvases initially */
  private loadCanvases(): void {
    this.canvasService.getAllCanvases().subscribe({
      next: response => this.updateCanvases(response.content || []),
      error: err => console.error('Failed to load canvases:', err)
    });
  }

  /** Merge & update canvas list */
  private updateCanvases(serverCanvases: Canvas[]): void {
    const timestamp = Date.now();

    serverCanvases.forEach(serverCanvas => {
      const existing = this.canvases.find(c => c.id === serverCanvas.id);
      const imageUrl = this.appendTimestamp(
        `http://localhost/pulse/api/live/renderer/canvas/previews/${serverCanvas.id}.png`,
        timestamp
      );

      if (existing) {
        existing.image = imageUrl;
        existing.status = serverCanvas.status || 'Active';
      } else {
        const newCanvas: Canvas = {
          ...serverCanvas,
          image: imageUrl,
          actionText: 'Open Canvas',
          status: serverCanvas.status || 'Active',
          participants: 0
        };
        this.canvases.push(newCanvas);
      }

      // ✅ Connect to participant count feed if not already connected
      if (serverCanvas.id && !this.participantsSubs.has(serverCanvas.id)) {
        const sub = this.canvasService
          .connectToParticipantsCountFeed(serverCanvas.id)
          .subscribe(count => {
            const found = this.canvases.find(c => c.id === serverCanvas.id);
            if (found) found.participants = count;
          });
        this.participantsSubs.set(serverCanvas.id, sub);
      }
    });

    // 🧹 Remove canvases no longer on server
    const activeIds = serverCanvases.map(c => c.id);
    this.canvases = this.canvases.filter(c => activeIds.includes(c.id!));

    // 🧹 Disconnect feeds for removed canvases
    this.participantsSubs.forEach((sub, id) => {
      if (!activeIds.includes(id)) {
        sub.unsubscribe();
        this.participantsSubs.delete(id);
        this.canvasService.disconnectParticipantsFeed(id);
      }
    });
  }

  /** Prevent browser caching of preview images */
  private appendTimestamp(url: string, timestamp: number): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
  }

  /** Create a new canvas */
  createCanvas(): void {
    const dialogRef = this.dialog.open(CanvasDialogComponent, {
      width: '500px',
      maxWidth: '90%'
    });

    dialogRef.afterClosed().subscribe((result: Canvas | null) => {
      if (!result) return;

      this.canvasService.createCanvas(result).subscribe({
        next: created => {
          const imageUrl = this.appendTimestamp(
            `http://localhost/pulse/api/live/renderer/canvas/previews/${created.id}.png`,
            Date.now()
          );

          const newCanvas: Canvas = {
            ...created,
            image: imageUrl,
            actionText: 'Open Canvas',
            status: created.status || 'Active',
            participants: 0
          };
          this.canvases.unshift(newCanvas);

          // Connect immediately to its participants feed
          if (created.id) {
            const sub = this.canvasService
              .connectToParticipantsCountFeed(created.id)
              .subscribe(count => {
                newCanvas.participants = count;
              });
            this.participantsSubs.set(created.id, sub);
          }

          this.router.navigate(['canvas'], { queryParams: { canvasId: created.id } });
        },
        error: err => console.error('Error creating canvas:', err)
      });
    });
  }

  /** Open existing canvas */
  openCanvas(canvas: Canvas): void {
    this.router.navigate(['/canvas'], { queryParams: { canvasId: canvas.id } });
  }

  /** Logout user */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['login']);
  }

  /** Toggle user dropdown */
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  /** Filter canvases by name */
  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return;
    this.canvases = this.canvases.filter(c =>
      c.name.toLowerCase().includes(query)
    );
  }
}
