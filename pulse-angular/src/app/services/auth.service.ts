// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { env } from '../environment/env';
import { Router } from '@angular/router';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = env.authUrl;
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient, private router: Router) {}

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  register(userData: {
    username: string;
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData)
      .pipe(
        tap((response: any) => {
          if (response.token) {
            this.saveToken(response.token);
          }
        })
      );
  }

  login(credentials: {
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response: any) => {
          if (response.token) {
            this.saveToken(response.token);
          }
        })
      );
  }

  validateEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/activate/${token}`).pipe(
      tap((response: any) => {
        if (response.token) {
          this.saveToken(response.token);
        }
      })
    );
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
 
  logout(): void {
    this.removeToken();
    this.router.navigate(['/login']);
  }
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  handleAuthentication(token: string): void {
    this.saveToken(token);
    this.router.navigate(['/home']);
  }
}
