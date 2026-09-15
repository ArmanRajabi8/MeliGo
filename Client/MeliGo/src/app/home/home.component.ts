import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HubService } from '../services/hub.service';
import { Item } from '../models/item';
import { UserService } from '../services/user.service';
import { I18nService } from '../services/i18n.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
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
    public userService: UserService,
    private i18n: I18nService
  ) {}

  get heroTitle(): string {
    const username = localStorage.getItem("username");

    if (this.userService.isLoggedIn() && username) {
      return this.i18n.t('home.heroTitle.loggedIn', { username });
    }

    return this.i18n.t('home.heroTitle.loggedOut');
  }

  get heroSubtitle(): string {
    if (this.userService.isLoggedIn()) {
      return this.i18n.t('home.heroSubtitle.loggedIn');
    }

    return this.i18n.t('home.heroSubtitle.loggedOut');
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
      return this.i18n.t('home.stat.trackedValue.loggedOut');
    }

    if (this.isLoading) {
      return "...";
    }

    return this.currencyPipe.transform(this.totalValue) ?? "$0.00";
  }

  getPreviewImage(index: number): string {
    return this.items[index]?.imageUrl || 'assets/images/default.jpg';
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
