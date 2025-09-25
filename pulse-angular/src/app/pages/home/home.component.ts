import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CanvasDialogComponent } from '../canvas-dialog/canvas-dialog/canvas-dialog.component';
import {AuthService} from '../../services/auth.service';

interface Canvas {
  id : number;
  image: string;
  title: string;
  description: string;
  creator?: string;
  participants: number;
  status: 'Active' | 'Draft' | 'Closed';
  meta?: string;
  actionText?: string;
  live?: boolean; // 👈 new field to handle live/red dot independently
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  searchQuery: string = '';

  // Example trending canvases
  trendingCanvases: Canvas[] = [
    {
      id: 1,
      image: 'https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg',
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

  // Example user collection
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

  constructor(private router: Router, private dialog: MatDialog,private authService : AuthService) {}

  /** Triggered when user searches */
  onSearch() {
    console.log('Searching for:', this.searchQuery);
    // TODO: integrate search with backend/filtering
  }

  /** Join a trending canvas */
  joinCanvas(canvas: Canvas) {
    console.log('Joining canvas:', canvas.title);
    this.router.navigate(['canvas'], { queryParams: { canvasId: canvas.id } });
  }

  /** Create a new canvas via dialog */
  createCanvas() {
    const dialogRef = this.dialog.open(CanvasDialogComponent, {
      width: '500px',
      maxWidth: '90%',
      height: 'auto',
      maxHeight: '90%',
      data: {}
    });

    dialogRef.afterClosed().subscribe((result: Canvas | null) => {
      if (result) {
        console.log('Canvas created successfully:', result);

        this.router.navigate(['canvas'], { queryParams: { canvasId: result.id } });
      } else {
        console.log('Canvas creation cancelled or failed');
      }
    });
  }

  /** Open a canvas from "My Collection" */
  openCanvas(canvas: Canvas) {
    console.log('Opening canvas:', canvas.title);
    this.router.navigate(['/canvas'], { queryParams: { title: canvas.title } });
  }
  dropdownOpen: boolean = false;

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  goToSettings() {
    this.router.navigate(['settings']);
  }
  quitApp(){
    this.logout()
  }
  logout(){
    this.authService.logout();
    try{
      this.router.navigate(['login']);
    }catch(e){
      console.log
    }
  }
}
