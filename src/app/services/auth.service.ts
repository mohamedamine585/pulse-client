// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { env } from '../environment/env';
import { Router } from '@angular/router';
import { get } from 'node:http';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
}

export interface User {
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = env.authUrl;
  private readonly TOKEN_KEY = 'auth_token';
  public isLoggedInSubject = new BehaviorSubject<boolean>(this.isLoggedIn()); // Initialize with current login status

  public userSubject = new BehaviorSubject<User | null>(null); // Initialize with null user
  public user$ = this.userSubject.asObservable(); // Expose the user observable

  private headers = {
    'Authorization': `Bearer ${this.getToken()}`,
    'Content-Type': 'application/json'
  };

  constructor(private http: HttpClient, private router: Router) {

    if(this.getToken()){
      this.getMe().subscribe((user: User) => {
        this.userSubject.next(user); // Emit the user data
      });
      this.isLoggedInSubject.next(true); // Emit the login status
    }
    else {
      this.isLoggedInSubject.next(false); // Emit the login status
      this.userSubject.next(null); // Emit null user
    }
  }

  
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
          if (response.access_token) {
            this.saveToken(response.access_token);
            this.getMe(); // Fetch user data after login

            this.isLoggedInSubject.next(true); // Emit the login status
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
    this.isLoggedInSubject.next(false); // Emit the logout status
    this.router.navigate(['/login']);
  }
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  getMe() : Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`,{headers: this.headers}).pipe(
      tap((response: any) => {
        console.log('User data:', response);
        this.userSubject.next(response); // Emit the user data
      })
    );
    
  }
  handleAuthentication(token: string): void {
    this.saveToken(token);
    this.router.navigate(['/home']);
  }
}
