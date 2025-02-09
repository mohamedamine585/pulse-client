import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  constructor(private router : Router) { }
    
  
  toCanvas(){
    console.log('to canvas');
    try{
      this.router.navigate(['canvas']);

    }catch(e){
      console.log(e);
    }
  
}
}