import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  user = {
    email: '',
    password: ''
  };
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  login() {
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.user).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.access_token) {
          this.authService.saveToken(response.access_token);
          this.toastr.success('Login successful!', 'Success');
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error.message || 'Login failed. Please try again.';
        this.toastr.error(this.errorMessage, 'Error');
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}