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


 // In your Angular service
async getUserItems(): Promise<Item[]> {
  const userId = localStorage.getItem("userId"); // Make sure this is set at login
  if (!userId) throw new Error("User ID not found in localStorage");

  return await lastValueFrom(
    this.http.get<Item[]>(`https://localhost:7066/api/Items/user/${userId}`)
  );
}
  async addItem(item: Item): Promise<Item> {
    return await lastValueFrom(this.http.post<Item>(`${domain}api/items`, item));
  }

  async updateItem(id: number, item: Item): Promise<Item> {
    return await lastValueFrom(this.http.put<Item>(`${domain}api/items/${id}`, item));
  }

  async deleteItem(id: number): Promise<void> {
    return await lastValueFrom(this.http.delete<void>(`${domain}api/items/${id}`));
  }

  async addItemFromLink(link: string): Promise<Item> {
    return await lastValueFrom(this.http.post<Item>(`${domain}api/items/link`, { link }));
  }



}
