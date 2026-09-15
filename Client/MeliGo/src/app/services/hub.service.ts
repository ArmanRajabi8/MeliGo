import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Hub } from '../models/hub';
import { lastValueFrom } from 'rxjs';
import { Item } from '../models/item';
import { buildApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class HubService {

  constructor(public http : HttpClient) { }

  async getUserHubs() : Promise<Hub[]>{
    let x = await lastValueFrom(this.http.get<Hub[]>(buildApiUrl("/api/Hubs")));
    console.log(x);
    return x;
  }

  async createHub(name: string): Promise<Hub> {
    let x = await lastValueFrom(this.http.post<Hub>(buildApiUrl("/api/Hubs"), { name }));
    console.log(x);
    return x;
  }

  async renameHub(id: number, name: string): Promise<Hub> {
    let x = await lastValueFrom(this.http.put<Hub>(buildApiUrl(`/api/Hubs/${id}`), { name }));
    console.log(x);
    return x;
  }

  async deleteHub(id: number): Promise<void> {
    await lastValueFrom(this.http.delete<void>(buildApiUrl(`/api/Hubs/${id}`)));
  }

  // Rejoindre / quitter un hub
  async toggleHubJoin(id : number) : Promise<void>{
    let x = await lastValueFrom(this.http.put<any>(buildApiUrl(`/api/Hubs/ToggleJoinHub/${id}`), null));
    console.log(x);
  }


 // In your Angular service
  async getUserItems(hubId?: number | null, userIdOverride?: string | null): Promise<Item[]> {
  const userId = userIdOverride ?? localStorage.getItem("userId"); // Make sure this is set at login
  if (!userId) {
    return [];
  }

  return await lastValueFrom(
    this.http.get<Item[]>(buildApiUrl(`/api/Items/user/${userId}${hubId ? `?hubId=${hubId}` : ""}`))
  );
}
  async addItem(item: Item): Promise<Item> {
    return await lastValueFrom(this.http.post<Item>(buildApiUrl("/api/items"), item));
  }

  async updateItem(id: number, item: Item): Promise<Item> {
    return await lastValueFrom(this.http.put<Item>(buildApiUrl(`/api/items/${id}`), item));
  }

  async deleteItem(id: number): Promise<void> {
    return await lastValueFrom(this.http.delete<void>(buildApiUrl(`/api/items/${id}`)));
  }

  async addItemFromLink(link: string): Promise<Item> {
    return await lastValueFrom(this.http.post<Item>(buildApiUrl("/api/items/link"), { link }));
  }



}
