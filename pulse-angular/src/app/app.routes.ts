import { Routes } from '@angular/router';
import { RegisterComponent } from './pages/auth/register/register.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { ValidateAccountComponent } from './pages/auth/validate-account/validate-account.component';
import { HomeComponent } from './pages/home/home.component';
import { CanvasComponent } from './pages/canvas/canvas.component';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'validate-account', component: ValidateAccountComponent },
  {path: 'canvas' , component : CanvasComponent},
  {path: 'home' , component : HomeComponent},
  {path: '', redirectTo: '/home', pathMatch: 'full'}

];
