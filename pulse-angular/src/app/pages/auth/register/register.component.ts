import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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

  constructor(private router: Router) {}

  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    return password.length >= 8;
  }

  register() {
    // Reset error message
    this.errorMessage = '';

    // Validate email
    if (!this.validateEmail(this.user.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    // Validate password length
    if (!this.validatePassword(this.user.password)) {
      this.errorMessage = 'Password must be at least 8 characters long';
      return;
    }

    // Validate password match
    if (this.user.password !== this.user.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.loading = true;
    // Simulate API call
    setTimeout(() => {
      this.loading = false;
      this.router.navigate(['/validate-account']);
    }, 1500);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}