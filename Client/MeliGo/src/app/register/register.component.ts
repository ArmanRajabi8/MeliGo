import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UserService } from '../services/user.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HubService } from '../services/hub.service';
import { Hub } from '../models/hub';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  registerUsername : string = "";
  registerEmail : string = "";
  registerPassword : string = "";
  registerPasswordConfirm : string = "";
  authError: string = "";
  isSubmitting: boolean = false;

  constructor(
    public userService : UserService,
    public hubService : HubService,
    public router : Router
  ) { }

  ngOnInit() {}

  get passwordsMatch(): boolean {
    return this.registerPassword === this.registerPasswordConfirm;
  }

  get canSubmit(): boolean {
    return (
      this.registerUsername.trim().length > 0 &&
      this.registerEmail.trim().length > 0 &&
      this.registerPassword.length > 0 &&
      this.registerPasswordConfirm.length > 0 &&
      this.passwordsMatch &&
      !this.isSubmitting
    );
  }

  async register() : Promise<void>{
    this.authError = "";
    this.isSubmitting = true;

    try {
      await this.userService.register(this.registerUsername, this.registerEmail, this.registerPassword, this.registerPasswordConfirm);
      await this.userService.login(this.registerUsername, this.registerPassword);

      const hubs: Hub[] = await this.hubService.getUserHubs();
      localStorage.setItem("myHubs", JSON.stringify(hubs));

      this.router.navigate(["/postList", "index"]);
    } catch (error: any) {
      this.authError = error?.error?.message || error?.error?.Message || "Registration failed.";
    } finally {
      this.isSubmitting = false;
    }
  }

}
