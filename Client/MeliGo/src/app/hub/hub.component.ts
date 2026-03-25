import { Component } from '@angular/core';
import { HubService } from '../services/hub.service';
import { Item } from '../models/item';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.css'
})
export class HubComponent {
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

  formItem: Partial<Item> = this.createEmptyForm();

  constructor(private hubService: HubService) {}

  async ngOnInit() {
    this.isLoggedIn = localStorage.getItem("token") != null && localStorage.getItem("userId") != null;

    if (!this.isLoggedIn) {
      this.items = [];
      return;
    }

    await this.loadItems();
  }

  private createEmptyForm(): Partial<Item> {
    return {
      name: '',
      price: 0,
      imageUrl: '',
      link: '',
      category: '',
      importance: 3
    };
  }

  private normalizeItemForm(): Item {
    return {
      name: (this.formItem.name || '').trim(),
      price: Number(this.formItem.price || 0),
      imageUrl: this.formItem.imageUrl?.trim() || undefined,
      link: this.formItem.link?.trim() || undefined,
      category: this.formItem.category?.trim() || 'Uncategorized',
      importance: Number(this.formItem.importance || 1)
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
      const userItems = await this.hubService.getUserItems();
      this.items = this.sortItems(userItems);
      this.loadError = "";
    } catch (err) {
      this.loadError = "We couldn't load your saved items right now.";
      console.error("Failed to load items:", err);
    } finally {
      this.isLoading = false;
    }
  }

  openAdd() {
    this.isAdding = true;
    this.isEditing = false;
    this.itemToEdit = null;
    this.formError = "";
    this.formItem = this.createEmptyForm();
  }

  openEdit(item: Item) {
    this.isEditing = true;
    this.isAdding = false;
    this.itemToEdit = item;
    this.formError = "";
    this.formItem = { ...this.createEmptyForm(), ...item };
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
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
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
  }

  trackByItem(index: number, item: Item): number | string {
    return item.id ?? item.name ?? index;
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

    return error?.error?.message || error?.error?.title || "We couldn't save this item right now.";
  }
}
