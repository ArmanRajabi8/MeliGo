import { Component } from '@angular/core';
import { HubService } from '../services/hub.service';
import { Item } from '../models/item';
import { Hub } from '../models/hub';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { I18nService } from '../services/i18n.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.css'
})
export class HubComponent {
  hubs: Hub[] = [];
  activeHubId: number | null = null;
  isLoadingHubs: boolean = false;
  hubError: string = "";
  isManagingHubs: boolean = false;
  newHubName: string = "";
  renameHubId: number | null = null;
  renameHubName: string = "";
  currentUserId: string | null = null;
  viewUserId: string | null = null;
  sharedWithMe: Array<{ ownerUserId: string; ownerUsername: string; sharedAt: string }> = [];
  isLoadingShared: boolean = false;

  items: Item[] = [];
  isLoggedIn: boolean = false;
  loadError: string = "";
  isLoading: boolean = false;

  isAdding: boolean = false;
  isEditing: boolean = false;
  isSaving: boolean = false;
  deletingItemId: number | null = null;
  formError: string = "";
  itemToEdit: Item | null = null;
  readonly prioritySteps = [1, 2, 3, 4, 5];
  private readonly defaultHubNames = new Set(['main cart', 'panier principal']);

  formItem: Partial<Item> = this.createEmptyForm();

  constructor(private hubService: HubService, private i18n: I18nService, private userService: UserService) {}

  async ngOnInit() {
    this.isLoggedIn = localStorage.getItem("token") != null && localStorage.getItem("userId") != null;
    this.currentUserId = localStorage.getItem("userId");
    this.viewUserId = this.currentUserId;

    if (!this.isLoggedIn) {
      this.items = [];
      return;
    }

    await this.loadHubs();
    await this.loadItems();
    await this.loadSharedWithMe();
  }

  private createEmptyForm(): Partial<Item> {
    return {
      name: '',
      price: 0,
      imageUrl: '',
      link: '',
      category: '',
      importance: 3,
      hubId: this.activeHubId ?? undefined
    };
  }

  private normalizeItemForm(): Item {
    return {
      name: (this.formItem.name || '').trim(),
      price: Number(this.formItem.price || 0),
      imageUrl: this.formItem.imageUrl?.trim() || undefined,
      link: this.formItem.link?.trim() || undefined,
      category: (this.formItem.category || '').trim(),
      importance: Number(this.formItem.importance || 1),
      hubId: this.formItem.hubId ?? this.activeHubId ?? undefined
    };
  }

  private sortItems(items: Item[]): Item[] {
    return [...items].sort((left, right) => {
      const rightDate = right.dateAdded ? new Date(right.dateAdded).getTime() : 0;
      const leftDate = left.dateAdded ? new Date(left.dateAdded).getTime() : 0;
      return rightDate - leftDate;
    });
  }

  async loadItems() {
    this.isLoading = true;

    try {
      const userItems = await this.hubService.getUserItems(this.activeHubId, this.viewUserId);
      this.items = this.sortItems(userItems);
      this.loadError = "";
    } catch (err) {
      this.loadError = this.i18n.t('hub.error.items');
      console.error("Failed to load items:", err);
    } finally {
      this.isLoading = false;
    }
  }

  openAdd() {
    if (this.isViewingShared) {
      return;
    }

    this.isAdding = true;
    this.isEditing = false;
    this.itemToEdit = null;
    this.formError = "";
    this.formItem = this.createEmptyForm();
  }

  openEdit(item: Item) {
    if (this.isViewingShared) {
      return;
    }

    this.isEditing = true;
    this.isAdding = false;
    this.itemToEdit = item;
    this.formError = "";
    this.formItem = { ...this.createEmptyForm(), ...item, hubId: item.hubId ?? this.activeHubId ?? undefined };
  }

  async saveItem() {
    this.formError = "";
    this.isSaving = true;

    try {
      const normalizedItem = this.normalizeItemForm();

      if (this.isAdding) {
        const added = await this.hubService.addItem(normalizedItem);
        this.items = this.sortItems([...this.items, added]);
      } else if (this.isEditing && this.itemToEdit) {
        const updated = await this.hubService.updateItem(this.itemToEdit.id!, normalizedItem);
        const index = this.items.findIndex(i => i.id === this.itemToEdit!.id);
        if (index > -1) this.items[index] = updated;
        this.items = this.sortItems(this.items);
      }

      this.cancel();
    } catch (err: any) {
      this.formError = this.getSaveErrorMessage(err);
      console.error("Failed to save item:", err);
    } finally {
      this.isSaving = false;
    }
  }

  cancel() {
    this.isAdding = false;
    this.isEditing = false;
    this.itemToEdit = null;
    this.formError = "";
    this.formItem = this.createEmptyForm();
  }

  async deleteItem(item: Item) {
    if (this.isViewingShared) {
      return;
    }

    if (!confirm(this.i18n.t('hub.confirm.deleteItem', { name: item.name }))) {
      return;
    }

    this.deletingItemId = item.id ?? null;

    try {
      await this.hubService.deleteItem(item.id!);
      this.items = this.items.filter(i => i.id !== item.id);
    } catch (err) {
      console.error("Failed to delete item:", err);
    } finally {
      this.deletingItemId = null;
    }
  }

  trackByItem(index: number, item: Item): number | string {
    return item.id ?? item.name ?? index;
  }

  getHubName(hubId?: number | null): string {
    if (!hubId) {
      return this.i18n.t('hub.defaultName');
    }

    const hub = this.hubs.find(hub => hub.id === hubId);
    return this.getHubDisplayName(hub);
  }

  getHubDisplayName(hub?: Hub | null): string {
    if (!hub) {
      return this.i18n.t('hub.defaultName');
    }

    if (hub.isDefault && this.isDefaultHubName(hub.name)) {
      return this.i18n.t('hub.defaultName');
    }

    return hub.name;
  }

  async loadHubs() {
    this.isLoadingHubs = true;

    try {
      const hubs = await this.hubService.getUserHubs();
      this.hubs = hubs;
      this.hubError = "";

      const storedHubId = localStorage.getItem("activeHubId");
      const storedId = storedHubId ? Number(storedHubId) : null;
      const defaultHub = hubs.find(hub => hub.isDefault) ?? hubs[0];

      if (storedId && hubs.some(hub => hub.id === storedId)) {
        this.activeHubId = storedId;
      } else {
        this.activeHubId = defaultHub?.id ?? null;
      }

      if (this.activeHubId != null) {
        localStorage.setItem("activeHubId", String(this.activeHubId));
      }
    } catch (err) {
      this.hubError = this.i18n.t('hub.error.hubs');
      console.error("Failed to load hubs:", err);
    } finally {
      this.isLoadingHubs = false;
    }
  }

  async loadSharedWithMe() {
    this.isLoadingShared = true;

    try {
      this.sharedWithMe = await this.userService.getSharedWithMe();
    } catch (err) {
      this.sharedWithMe = [];
    } finally {
      this.isLoadingShared = false;
    }
  }

  async selectHub(hub: Hub) {
    if (this.activeHubId === hub.id) {
      return;
    }

    this.activeHubId = hub.id;
    localStorage.setItem("activeHubId", String(hub.id));
    this.formItem.hubId = hub.id;
    await this.loadItems();
  }

  async selectSharedUser(userId: string | null) {
    this.viewUserId = userId;

    if (this.viewUserId === this.currentUserId) {
      await this.loadHubs();
      await this.loadItems();
      return;
    }

    this.isAdding = false;
    this.isEditing = false;
    this.itemToEdit = null;
    this.formItem = this.createEmptyForm();
    this.activeHubId = null;
    await this.loadItems();
  }

  openHubManager() {
    if (this.isViewingShared) {
      return;
    }

    this.isManagingHubs = !this.isManagingHubs;
    this.renameHubId = null;
    this.renameHubName = "";
    this.newHubName = "";
  }

  startRename(hub: Hub) {
    this.renameHubId = hub.id;
    this.renameHubName = hub.name;
  }

  cancelRename() {
    this.renameHubId = null;
    this.renameHubName = "";
  }

  async createHub() {
    if (this.isViewingShared) {
      return;
    }

    const name = this.newHubName.trim();
    if (!name) {
      return;
    }

    try {
      const created = await this.hubService.createHub(name);
      this.hubs = [...this.hubs, created];
      this.newHubName = "";
      await this.selectHub(created);
    } catch (err) {
      console.error("Failed to create hub:", err);
    }
  }

  async renameHub(hub: Hub) {
    if (this.isViewingShared) {
      return;
    }

    const name = this.renameHubName.trim();
    if (!name) {
      return;
    }

    try {
      const updated = await this.hubService.renameHub(hub.id, name);
      this.hubs = this.hubs.map(existing => existing.id === hub.id ? { ...existing, ...updated } : existing);
      this.cancelRename();
    } catch (err) {
      console.error("Failed to rename hub:", err);
    }
  }

  async deleteHub(hub: Hub) {
    if (this.isViewingShared) {
      return;
    }

    if (hub.isDefault) {
      return;
    }

    if (!confirm(this.i18n.t('hub.confirm.deleteHub', { name: hub.name }))) {
      return;
    }

    try {
      await this.hubService.deleteHub(hub.id);
      this.hubs = this.hubs.filter(existing => existing.id !== hub.id);
      if (this.activeHubId === hub.id) {
        const fallback = this.hubs.find(existing => existing.isDefault) ?? this.hubs[0] ?? null;
        this.activeHubId = fallback?.id ?? null;
        if (this.activeHubId != null) {
          localStorage.setItem("activeHubId", String(this.activeHubId));
        }
        await this.loadItems();
      }
    } catch (err) {
      console.error("Failed to delete hub:", err);
    }
  }

  private getSaveErrorMessage(error: any): string {
    const validationErrors = error?.error?.errors;
    if (validationErrors && typeof validationErrors === "object") {
      const messages = Object.values(validationErrors)
        .flatMap((value) => Array.isArray(value) ? value : [String(value)])
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }

    return error?.error?.message || error?.error?.title || this.i18n.t('hub.error.saveGeneric');
  }

  getCategoryLabel(category?: string | null): string {
    const trimmed = (category ?? '').trim();

    if (!trimmed || trimmed.toLowerCase() === 'uncategorized') {
      return this.i18n.t('hub.item.uncategorized');
    }

    return trimmed;
  }

  private isDefaultHubName(name?: string | null): boolean {
    if (!name) {
      return true;
    }

    return this.defaultHubNames.has(name.trim().toLowerCase());
  }

  get isViewingShared(): boolean {
    return !!this.viewUserId && this.viewUserId !== this.currentUserId;
  }
}
