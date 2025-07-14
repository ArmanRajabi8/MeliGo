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
  filteredItems: Item[] = [];

  // Filters
  filterCategory: string = '';
  filterMinImportance: number = 1;
  filterDateAdded: string = ''; // yyyy-mm-dd string for filtering

  // Add / Edit UI
  isAdding: boolean = false;
  isEditing: boolean = false;
  itemToEdit: Item | null = null;

  // New / Edit form model
  formItem: Partial<Item> = {
    name: '',
    price: 0,
    imageUrl: '',
    category: '',
    importance: 1
  };

  constructor(private hubService: HubService) {}

  async ngOnInit() {
    await this.loadItems();
  }

  async loadItems() {
    this.items = await this.hubService.getUserItems();
    this.applyFilters();
  }

  applyFilters() {
    this.filteredItems = this.items.filter(item => {
      const matchCategory = this.filterCategory ? item.category === this.filterCategory : true;
      const matchImportance = item.importance >= this.filterMinImportance;
      const matchDate = this.filterDateAdded ? new Date(item.dateAdded!) >= new Date(this.filterDateAdded) : true;
      return matchCategory && matchImportance && matchDate;
    });
  }

  // Open add item form
  openAdd() {
    this.isAdding = true;
    this.isEditing = false;
    this.formItem = { name: '', price: 0, imageUrl: '', category: '', importance: 1 };
  }

  // Open edit form for an item
  openEdit(item: Item) {
    this.isEditing = true;
    this.isAdding = false;
    this.itemToEdit = item;
    this.formItem = { ...item }; // copy values
  }

  async saveItem() {
    if (this.isAdding) {
      const added = await this.hubService.addItem(this.formItem as Item);
      this.items.push(added);
    } else if (this.isEditing && this.itemToEdit) {
      const updated = await this.hubService.updateItem(this.itemToEdit.id!, this.formItem as Item);
      // Update item locally
      const index = this.items.findIndex(i => i.id === this.itemToEdit!.id);
      if (index > -1) this.items[index] = updated;
    }

    this.isAdding = false;
    this.isEditing = false;
    this.itemToEdit = null;
    this.applyFilters();
  }

  cancel() {
    this.isAdding = false;
    this.isEditing = false;
    this.itemToEdit = null;
  }

  async deleteItem(item: Item) {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      
      await this.hubService.deleteItem(item.id!);
      this.items = this.items.filter(i => i.id !== item.id);
      this.applyFilters();
    }
  }
}
