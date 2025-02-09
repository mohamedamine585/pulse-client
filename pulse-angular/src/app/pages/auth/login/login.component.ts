import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone:false
})
export class LoginComponent {
  user = {
    email: '',
    password: ''
  };
  errorMessage: string = '';

  constructor(private router: Router) {}

  login() {
    console.log('Login attempt:', this.user);
    // Add your login logic here
  }

  goToRegister() {
    console.log('Navigating to register');
    this.router.navigate(['/register']);
  }
}