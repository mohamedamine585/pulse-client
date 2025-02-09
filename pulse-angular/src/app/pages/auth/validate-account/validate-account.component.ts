import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-validate-account',
  standalone:false,
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="app-logo">
          <h1>Pulse</h1>
          <p>Account Validation</p>
        </div>
        
        <div class="validation-content">
          <mat-spinner *ngIf="loading" diameter="40"></mat-spinner>
          <button *ngIf="!loading" (click)="validateAccount()" class="btn-primary">
            Validate Account
          </button>
        </div>
      </div>
    </div>
  `
})
export class ValidateAccountComponent {
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  validateAccount() {
    this.loading = true;
    // Replace with actual token from URL or storage
    const token = 'dummy-token';
    
    this.authService.validateAccount(token).subscribe({
      next: (response:any) => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Validation failed:', error);
      }
    });
  }
}