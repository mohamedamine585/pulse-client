import { Routes } from '@angular/router';
import { RegisterComponent } from './pages/auth/register/register.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { ValidateAccountComponent } from './pages/auth/validate-account/validate-account.component';
import { HomeComponent } from './pages/home/home.component';
import { CanvasComponent } from './pages/canvas/canvas.component';
import { SessionGuard } from './gards/session.guard';
import { AuthGuard } from './gards/auth.gard';
import { CanvasDialogComponent } from './pages/canvas-dialog/canvas-dialog/canvas-dialog.component';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent , canActivate: [SessionGuard] },
  { path: 'login', component: LoginComponent , canActivate : [SessionGuard]},
  { path: 'validate-account/:token', component: ValidateAccountComponent ,canActivate : [SessionGuard]},
  {path: 'canvas' , component : CanvasComponent , canActivate : [AuthGuard]},
  {path: 'canvas/:canvasId' , component : CanvasComponent , canActivate : [AuthGuard]},
  {path: 'home' , component : HomeComponent , canActivate : [AuthGuard]},
  {path: 'canvas-dialog' , component : CanvasDialogComponent , canActivate : [AuthGuard]},
  {path: '', redirectTo: '/home', pathMatch: 'full' }

];
