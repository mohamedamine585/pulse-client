// src/app/pages/auth/canvas-dialog/canvas-dialog.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CanvasService } from '../../../services/canvas.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-canvas-dialog',
  templateUrl: './canvas-dialog.component.html',
  styleUrls: ['./canvas-dialog.component.css']
})
export class CanvasDialogComponent {
  canvas = {
    name: '',
    isPublic: false
  };

  errorMessage: string = '';

  canvasId : any ;
  constructor(
    private router: Router,
    private canvasService: CanvasService,
    private toastr: ToastrService,
    private dialog: MatDialogRef<CanvasDialogComponent>, // Use MatDialogRef for closing the dialog
  ) {}

  startDrawing(): void {
    if (this.canvas.name && this.canvas.name.length >= 3) {
      this.canvasService.createCanvas({
        name: this.canvas.name,
      }).subscribe(
        (canvas) => {
          console.log('Canvas created:', canvas);
          if(canvas.id) {
            this.dialog.close(canvas); // Close the dialog and pass the canvas ID
          }
        },
        (error) => {
          console.error('Error creating canvas:', error);
          this.errorMessage = 'Failed to create canvas';
          this.toastr.error('Error creating canvas', 'Error');
        }
      );
    } else {
      this.errorMessage = 'Canvas name must be at least 3 characters long';
    }
  }

  cancel(): void {
    this.dialog.close(); // Close the dialog without any action
  }
}
