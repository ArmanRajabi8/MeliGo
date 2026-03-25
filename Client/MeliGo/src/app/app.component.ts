import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
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
    HttpClientModule // ⬅️ Add this
    ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  avatarUrl: string = 'assets/images/default.jpg';

  constructor(public userService : UserService){}

  get statusLabel(): string {
    return this.userService.isLoggedIn() ? "Live sync enabled" : "Guest mode";
  }

  get statusCopy(): string {
    return this.userService.isLoggedIn()
      ? "Your app and extension are ready to save products together."
      : "Sign in once and the extension will start saving products to your cart.";
  }

  refreshAvatar(useCacheBust: boolean = false): void {
    const username = localStorage.getItem("username");

    if (!username) {
      this.avatarUrl = 'assets/images/default.jpg';
      return;
    }

    const cacheBuster = useCacheBust ? `?t=${Date.now()}` : "";
    this.avatarUrl = buildApiUrl(`/api/Users/GetAvatar/${username}${cacheBuster}`);
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

  this.refreshAvatar();

  this.userService.avatarChanged$.subscribe(() => {
    this.refreshAvatar(true);
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
