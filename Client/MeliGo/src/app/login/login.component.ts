import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UserService } from '../services/user.service';
import { HubService } from '../services/hub.service';
import { Router, RouterLink } from '@angular/router';
import { Hub } from '../models/hub';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  loginUsername: string = "";
  loginPassword: string = "";
  authError: string = "";
  isSubmitting: boolean = false;

  constructor(
    public userService: UserService,
    public hubService: HubService,
    public router: Router
  ) {}

  ngOnInit() {}

  get canSubmit(): boolean {
    return this.loginUsername.trim().length > 0 && this.loginPassword.length > 0 && !this.isSubmitting;
  }

  async login(): Promise<void> {
    this.authError = "";
    this.isSubmitting = true;

    try {
      await this.userService.login(this.loginUsername, this.loginPassword);

      let hubs: Hub[] = await this.hubService.getUserHubs();
      localStorage.setItem("myHubs", JSON.stringify(hubs));

      this.router.navigate(["/postList", "index"]);
    } catch (error: any) {
      this.authError = error?.error?.message || error?.error?.Message || "Login failed. Check your username/email and password.";
    } finally {
      this.isSubmitting = false;
    }
  }
}
