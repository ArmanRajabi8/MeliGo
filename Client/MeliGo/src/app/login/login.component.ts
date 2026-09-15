import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UserService } from '../services/user.service';
import { HubService } from '../services/hub.service';
import { Router, RouterLink } from '@angular/router';
import { Hub } from '../models/hub';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../pipes/translate.pipe';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
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
    public router: Router,
    private i18n: I18nService
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
      this.authError = error?.error?.message || error?.error?.Message || this.i18n.t('auth.login.errorDefault');
    } finally {
      this.isSubmitting = false;
    }
  }
}
