import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CanvasDialogComponent } from '../canvas-dialog/canvas-dialog/canvas-dialog.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  searchQuery: string = '';
  
  items = [
    {
      image: 'https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg',
      title: 'Modern UI Design',
      date: new Date()
    },
    {
      image: 'https://image-cdn.hypb.st/https%3A%2F%2Fhypebeast.com%2Fimage%2F2021%2F10%2Fbored-ape-yacht-club-nft-3-4-million-record-sothebys-metaverse-0.jpg?w=960&cbr=1&q=90&fit=max',
      title: 'Responsive Web Apps',
      date: new Date()
    },
    {
      image: 'https://www.coexya.eu/app/uploads/2022/04/nft-singes.webp',
      title: 'Angular Best Practices',
      date: new Date()
    }
  ];

  constructor(private router: Router,private dialog : MatDialog) {}

  readMore() {
    console.log('to canvas');
    try {
      this.router.navigate(['canvas']);
    } catch (e) {
      console.log(e);
    }
  }

  openAddCanvasDialog() {
    const dialogRef = this.dialog.open(CanvasDialogComponent, {
      width: '500px',
      maxWidth: '90%',
      height: 'auto',
      maxHeight: '90%',
      data: {}
    });

  dialogRef.afterClosed().subscribe(result => {

      if (result) {
        console.log('Canvas created successfully:', result);
        
        this.router.navigate(['/canvas'],{queryParams : {canvasId : result}}); // Navigate to the canvas page with the new canvas ID
      } else {
        console.log('Canvas creation cancelled or failed');
      }
    } );
     
  }

  searchCanvas() {
    console.log('Searching for:', this.searchQuery);
    // Implement search functionality as needed.
  }

  goToCreateCanvas() {
    this.openAddCanvasDialog();
  }
}