import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Hub } from '../models/hub';
import { lastValueFrom } from 'rxjs';
import { Item } from '../models/item';

const domain = "https://localhost:7066/";

@Injectable({
  providedIn: 'root'
})
export class HubService {

  constructor(public http : HttpClient) { }

  // Créer un nouveau hub
  async postHub(hubName : string) : Promise<Hub>{

    let newHub = new Hub(0, hubName, false);

    let x = await lastValueFrom(this.http.post<Hub>(domain + "api/Hubs/PostHub", newHub));
    console.log(x);
    return x;

  }

  // Obtenir un hub précis quand on affiche ses posts
  async getHub(id : number) : Promise<Hub>{
    console.log(id);
    let x = await lastValueFrom(this.http.get<Hub>(domain + "api/Hubs/GetHub/" + id));
    console.log(x);
    return x;
  }

  // Obtenir la liste des hubs de l'utilisateur
  async getUserHubs() : Promise<Hub[]>{

    let x = await lastValueFrom(this.http.get<Hub[]>(domain + "api/Hubs/GetUserHubs"));
    console.log(x);
    return x;

  }

  // Rejoindre / quitter un hub
  async toggleHubJoin(id : number) : Promise<void>{
    let x = await lastValueFrom(this.http.put<any>(domain + "api/Hubs/ToggleJoinHub/" + id, null));
    console.log(x);
  }

// ✅ Get all items in the user's hub
async getUserItems(): Promise<Item[]> {
  return await lastValueFrom(this.http.get<Item[]>(domain + "api/Hubs/GetUserHubs"));
}

// ✅ Add an item manually
async addItem(item: Item): Promise<Item> {
  return await lastValueFrom(this.http.post<Item>(domain + "api/Hubs/AddItem", item));
}

// ✅ Modify an item
async updateItem(id: number, item: Item): Promise<Item> {
  return await lastValueFrom(this.http.put<Item>(domain + "api/Hubs/UpdateItem/" + id, item));
}

// ✅ Delete an item
async deleteItem(id: number): Promise<void> {
  return await lastValueFrom(this.http.delete<void>(domain + "api/Hubs/DeleteItem/" + id));
}


}
