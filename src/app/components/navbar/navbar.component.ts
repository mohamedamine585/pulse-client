import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  constructor(private router : Router,public authService : AuthService) {


    this.authService.isLoggedInSubject.subscribe((isLoggedIn) => {
      console.log('isLoggedIn:', isLoggedIn);
    })

    this.authService.user$.subscribe((user) => {
      this.username = user?.username || ''; // Update username from user observable
    });
  }


  username: string = ''; // Replace with dynamic data as needed


  goToTrade() {
    this.router.navigate(['trade']);
  }
  goToMe(){
    this.router.navigate(['me']);
  }
  quitApp(){
    this.logout()
  }

  logout(){
    this.authService.logout();
    try{
      this.router.navigate(['login']);
    }catch(e){
      console.log
    }
  }
  toCanvas(){
    console.log('to canvas');
    try{
      this.router.navigate(['canvas']);

    }catch(e){
      console.log(e);
    }

  }
}
