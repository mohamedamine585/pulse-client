import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RegisterComponent } from './pages/auth/register/register.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ValidateAccountComponent } from './pages/auth/validate-account/validate-account.component';
import { HomeComponent } from './pages/home/home.component';
import { CanvasComponent } from './pages/canvas/canvas.component';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';
import { NavbarComponent } from './components/navbar/navbar.component';

@NgModule({
  bootstrap: [AppComponent],

  declarations: [
    AppComponent,
    RegisterComponent,
    LoginComponent,
    ValidateAccountComponent,
    HomeComponent,
    CanvasComponent,
    NavbarComponent
  ],
  imports: [
    RouterModule.forRoot(routes),
    FormsModule,
    HttpClientModule,
    BrowserModule,
    MatProgressSpinnerModule
  ],
  providers: [],
})
export class AppModule { }