import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

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
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute,

  ) {}
  token: string | null = null;
  ngOnInit() {
    this.token = this.route.snapshot.url[this.route.snapshot.url.length - 1].path;

  }

  validateAccount() {
    if (!this.token) {
      this.toastr.error('Invalid validation token', 'Error');
      return;
    }

    this.loading = true;
    this.authService.validateEmail(this.token).subscribe({
      next: (response) => {
        this.loading = false;
      
        this.toastr.success('Email verified successfully!', 'Success');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error.error.message || 'Email verification failed';
        this.toastr.error(errorMessage, 'Error');
        this.router.navigate(['/login']);
      }
    });
  }
}