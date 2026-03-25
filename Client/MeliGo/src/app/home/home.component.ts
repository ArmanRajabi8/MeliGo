import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HubService } from '../services/hub.service';
import { Item } from '../models/item';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [CurrencyPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  items: Item[] = [];
  isLoggedIn: boolean = false;
  isLoading: boolean = false;

  constructor(
    private hubService: HubService,
    private currencyPipe: CurrencyPipe,
    public userService: UserService
  ) {}

  get heroTitle(): string {
    const username = localStorage.getItem("username");

    if (this.userService.isLoggedIn() && username) {
      return `Build a sharper cart around what ${username} actually wants.`;
    }

    return "Save anything worth buying before it disappears into twenty open tabs.";
  }

  get heroSubtitle(): string {
    if (this.userService.isLoggedIn()) {
      return "MeliGo keeps your finds in one calm dashboard, with the extension ready to capture details from any store in seconds.";
    }

    return "Capture products from Amazon, niche shops, and everywhere in between, then return to one clean shopping cockpit whenever you are ready.";
  }

  get totalValue(): number {
    return this.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }

  get categoryCount(): number {
    const categories = this.items
      .map((item) => item.category?.trim())
      .filter((category): category is string => !!category);

    return new Set(categories).size;
  }

  get topPriorityCount(): number {
    return this.items.filter((item) => Number(item.importance) >= 4).length;
  }

  get trackedValueLabel(): string {
    if (!this.isLoggedIn) {
      return "Live";
    }

    if (this.isLoading) {
      return "...";
    }

    return this.currencyPipe.transform(this.totalValue) ?? "$0.00";
  }

  async ngOnInit() {
    this.isLoggedIn = localStorage.getItem("token") != null && localStorage.getItem("userId") != null;

    if (!this.isLoggedIn) {
      return;
    }

    this.isLoading = true;

    try {
      this.items = await this.hubService.getUserItems();
    } finally {
      this.isLoading = false;
    }
  }
}
