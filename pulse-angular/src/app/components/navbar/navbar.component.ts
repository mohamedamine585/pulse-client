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
  constructor(private router : Router,private authService : AuthService) { }
    
  
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