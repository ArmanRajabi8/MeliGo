import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { UserService } from './services/user.service';
import { HttpClientModule } from '@angular/common/http'; 
import { buildApiUrl } from './config/api.config';
import { I18nService } from './services/i18n.service';
import { TranslatePipe } from './pipes/translate.pipe';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
    HttpClientModule,
    TranslatePipe
    ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  avatarUrl: string = 'assets/images/default.jpg';

  constructor(public userService : UserService, private i18n: I18nService){}

  get statusLabel(): string {
    return this.userService.isLoggedIn()
      ? this.i18n.t('nav.status.liveLabel')
      : this.i18n.t('nav.status.guestLabel');
  }

  get statusCopy(): string {
    return this.userService.isLoggedIn()
      ? this.i18n.t('nav.status.liveCopy')
      : this.i18n.t('nav.status.guestCopy');
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
