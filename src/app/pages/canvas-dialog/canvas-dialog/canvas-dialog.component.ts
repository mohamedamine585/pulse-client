import { Component } from '@angular/core';
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

  errorMessage = '';

  constructor(public dialogRef: MatDialogRef<CanvasDialogComponent>) {}

  startDrawing(): void {
    if (!this.canvas.name?.trim()) {
      this.errorMessage = 'Please enter a canvas name';
      return;
    }
    this.dialogRef.close(this.canvas);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  clearError(): void {
    this.errorMessage = '';
  }
}
