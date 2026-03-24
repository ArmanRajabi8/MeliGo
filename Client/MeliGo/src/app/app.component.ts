import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Hub } from './models/hub';
import { HubService } from './services/hub.service';
import { UserService } from './services/user.service';
import { HttpClientModule } from '@angular/common/http'; 
import { buildApiUrl } from './config/api.config';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
    FormsModule,
    HttpClientModule // ⬅️ Add this
    ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'MeliGo';
 searchText : string = "";

  hubsToggled : boolean = false;
  hubList : Hub[] = [];
avatarUrl: string = 'assets/images/default.jpg';
  constructor(public hubService : HubService, public userService : UserService){}

  async toggleHubs(){

    this.hubsToggled = !this.hubsToggled;

    if(this.hubsToggled && localStorage.getItem("token") != null){
      let jsonHubs : string | null = localStorage.getItem("myHubs");
      if(jsonHubs != null) this.hubList = JSON.parse(jsonHubs);
    }
  }

  ngOnInit(): void {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const rolesJson = localStorage.getItem("roles");
  const roles = rolesJson ? JSON.parse(rolesJson) : [];
  this.userService.setUsername(username);
  this.userService.setRoles(roles);

  if (token) {
    window.postMessage({ type: "MELIGO_TOKEN", token }, "*");
  }

 if (username) {
    this.avatarUrl = buildApiUrl(`/api/Users/GetAvatar/${username}`);
  }
   // ✅ Subscribe to avatar changes
  this.userService.avatarChanged$.subscribe(() => {
    const newUsername = localStorage.getItem("username");
    if (newUsername) {
      this.avatarUrl = buildApiUrl(`/api/Users/GetAvatar/${newUsername}`);
    }
  });
}

  logout(){
    localStorage.clear();
    window.postMessage({ type: "MELIGO_TOKEN_CLEAR" }, "*");
    location.reload();
  }
  isAdmin(): boolean {
  let roles = JSON.parse(localStorage.getItem("roles") ?? "[]");
  return roles.includes("admin");
}
}
