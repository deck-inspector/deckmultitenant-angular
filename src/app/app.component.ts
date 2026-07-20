import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UsersService } from './users.service';
import { Auth } from '@angular/fire/auth';
import { LoginService } from './login.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'crm-app';
  opened: boolean = window.innerWidth > 1024;
  isMobile: boolean = window.innerWidth <= 1024;
  userMenuOpen: boolean = false;
  date: Date = new Date();
  storedUsername: string | null = null;

  constructor(
    public router: Router,
    public usersService: UsersService,
    private loginService: LoginService
  ) {}

  async ngOnInit() {
    const authToken = JSON.parse(localStorage.getItem('authToken')!);
    //commented only for development purpose
    //don't push in production without auth validation
    // if (authToken) {
    //   if (authToken === 'guest') {
    //     this.usersService.connectToDatabase('guest', 'Guest');
    //   } else {
    //     const authData = JSON.parse(authToken);
    //     this.usersService.connectToDatabase(authData.id, authData.name);
    //   }
    if(!authToken) {
      this.router.navigateByUrl('/login');
    }
    const storedUsername = authToken.name;

    if (storedUsername) {
      // If available, set it to the component property
      this.storedUsername = storedUsername;
    } else {
      // Otherwise, get it from the service and store it
      this.storedUsername = this.loginService.currentlyLoggedInUsername;
      localStorage.setItem('loggedInUsername', this.storedUsername);
    }

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.userMenuOpen = false;
        if (window.innerWidth <= 1024) { this.opened = false; }
      }
    });
  }

  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/login');
  }
}
