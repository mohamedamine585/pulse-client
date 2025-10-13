import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CanvasDialogComponent } from '../canvas-dialog/canvas-dialog/canvas-dialog.component';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';

interface Canvas {
  id: number;
  image: string;
  title: string;
  description: string;
  creator?: string;
  participants: number;
  status: 'Active' | 'Draft' | 'Closed';
  meta?: string;
  actionText?: string;
  live?: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  dropdownOpen: boolean = false;
  private refreshSub!: Subscription;

  trendingCanvases: Canvas[] = [
    {
      id: 1,
      image: 'http://localhost:8083/live/renderer/canvas/previews/324.png',
      title: 'Modern UI Design',
      description: 'Explore modern UI principles and design trends.',
      creator: 'Alice',
      participants: 12,
      status: 'Active',
      live: true
    },
    {
      id: 2,
      image: 'https://image-cdn.hypb.st/https%3A%2F%2Fhypebeast.com%2Fimage%2F2021%2F10%2Fbored-ape-yacht-club-nft-3-4-million-record-sothebys-metaverse-0.jpg?w=960&cbr=1&q=90&fit=max',
      title: 'Responsive Web Apps',
      description: 'Build and discuss responsive applications.',
      creator: 'Bob',
      participants: 8,
      status: 'Draft',
      live: false
    }
  ];

  myCollection: Canvas[] = [
    {
      id: 3,
      image: 'https://www.coexya.eu/app/uploads/2022/04/nft-singes.webp',
      title: 'Angular Best Practices',
      description: 'A curated guide for Angular developers.',
      participants: 5,
      status: 'Active',
      meta: 'Last edited 2 days ago',
      actionText: 'Open',
      live: true
    },
    {
      id: 4,
      image: 'https://placehold.co/600x400',
      title: 'Blockchain Workshop',
      description: 'Hands-on blockchain concepts and coding.',
      participants: 10,
      status: 'Closed',
      meta: 'Completed 1 month ago',
      actionText: 'View',
      live: false
    }
  ];

  constructor(private router: Router, private dialog: MatDialog, private authService: AuthService) {}

  ngOnInit() {
    // Refresh images every 5 seconds
    this.refreshSub = interval(5000).subscribe(() => this.refreshImages());
  }

  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }

  private refreshImages() {
    const timestamp = new Date().getTime();

    this.trendingCanvases = this.trendingCanvases.map(c => ({
      ...c,
      image: this.appendTimestamp(c.image, timestamp)
    }));

    this.myCollection = this.myCollection.map(c => ({
      ...c,
      image: this.appendTimestamp(c.image, timestamp)
    }));
  }

  private appendTimestamp(url: string, timestamp: number): string {
    // Add ?t=12345 or &t=12345 to force reload
    return url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
  }

  // ... all other methods stay the same ...
  onSearch() { console.log('Searching for:', this.searchQuery); }
  joinCanvas(canvas: Canvas) { this.router.navigate(['canvas'], { queryParams: { canvasId: canvas.id } }); }
  createCanvas() {
    const dialogRef = this.dialog.open(CanvasDialogComponent, { width: '500px', maxWidth: '90%', height: 'auto', maxHeight: '90%', data: {} });
    dialogRef.afterClosed().subscribe((result: Canvas | null) => {
      if (result) this.router.navigate(['canvas'], { queryParams: { canvasId: result.id } });
    });
  }
  openCanvas(canvas: Canvas) { this.router.navigate(['/canvas'], { queryParams: { title: canvas.title } }); }
  toggleDropdown() { this.dropdownOpen = !this.dropdownOpen; }
  goToSettings() { this.router.navigate(['settings']); }
  quitApp() { this.logout(); }
  logout() { this.authService.logout(); this.router.navigate(['login']); }
}
