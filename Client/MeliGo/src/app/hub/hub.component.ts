import { Component } from '@angular/core';
import { HubService } from '../services/hub.service';
import { Item } from '../models/item';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.css'
})
export class HubComponent {
  items: Item[] = [];
  isLoggedIn: boolean = false;
  loadError: string = "";

  isAdding: boolean = false;
  isEditing: boolean = false;
  itemToEdit: Item | null = null;

  formItem: Partial<Item> = {
    name: '',
    price: 0,
    imageUrl: '',
    category: '',
    importance: 1
  };

  constructor(private hubService: HubService) {}

  async ngOnInit() {
    this.isLoggedIn = localStorage.getItem("token") != null && localStorage.getItem("userId") != null;

    if (!this.isLoggedIn) {
      this.items = [];
      return;
    }

    await this.loadItems();
  }

  async loadItems() {
    try {
      this.items = await this.hubService.getUserItems();
      this.loadError = "";
      console.log("Loaded items:", this.items);
    } catch (err) {
      this.loadError = "We couldn't load your saved items right now.";
      console.error("Failed to load items:", err);
    }
  }

  openAdd() {
    this.isAdding = true;
    this.isEditing = false;
    this.formItem = { name: '', price: 0, imageUrl: '', category: '', importance: 1 };
  }

  openEdit(item: Item) {
    this.isEditing = true;
    this.isAdding = false;
    this.itemToEdit = item;
    this.formItem = { ...item };
  }

  async saveItem() {
    try {
      if (this.isAdding) {
        const added = await this.hubService.addItem(this.formItem as Item);
        this.items.push(added);
      } else if (this.isEditing && this.itemToEdit) {
        const updated = await this.hubService.updateItem(this.itemToEdit.id!, this.formItem as Item);
        const index = this.items.findIndex(i => i.id === this.itemToEdit!.id);
        if (index > -1) this.items[index] = updated;
      }

      this.isAdding = false;
      this.isEditing = false;
      this.itemToEdit = null;
    } catch (err) {
      console.error("Failed to save item:", err);
    }
  }

  cancel() {
    this.isAdding = false;
    this.isEditing = false;
    this.itemToEdit = null;
  }

  async deleteItem(item: Item) {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await this.hubService.deleteItem(item.id!);
        this.items = this.items.filter(i => i.id !== item.id);
      } catch (err) {
        console.error("Failed to delete item:", err);
      }
    }
  }
}
