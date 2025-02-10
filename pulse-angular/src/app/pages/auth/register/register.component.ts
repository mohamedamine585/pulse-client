import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone:false
})
export class RegisterComponent {
  user = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    return password.length >= 8;
  }

  register() {
    this.errorMessage = '';

    if (!this.validateEmail(this.user.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    if (!this.validatePassword(this.user.password)) {
      this.errorMessage = 'Password must be at least 8 characters long';
      return;
    }

    if (this.user.password !== this.user.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.loading = true;
    const registerData = {
      username: this.user.username,
      email: this.user.email,
      password: this.user.password
    };

    this.authService.register(registerData).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success('Registration successful! Please check your email to verify your account.', 'Success');
        this.router.navigate(['/validate-account']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error.message || 'Registration failed. Please try again.';
        this.toastr.error(this.errorMessage, 'Error');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}