import { Component } from '@angular/core';
import { UserService } from '../services/user.service';
import { HubService } from '../services/hub.service';
import { Router } from '@angular/router';
import { Hub } from '../models/hub';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  loginUsername: string = "";
  loginPassword: string = "";

  constructor(
    public userService: UserService,
    public hubService: HubService,
    public router: Router
  ) {}

  ngOnInit() {}

  async login(): Promise<void> {
    await this.userService.login(this.loginUsername, this.loginPassword);

    // ✅ Correct method and type
    let hubs: Hub[] = await this.hubService.getUserHubs();
    localStorage.setItem("myHubs", JSON.stringify(hubs));

    this.router.navigate(["/postList", "index"]);
  }
}