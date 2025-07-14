import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom, lastValueFrom, Subject } from 'rxjs';

const domain = "https://localhost:7066/";

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private SIGNAL_DU_PSEUDO = signal<string | null>(null);
  username = this.SIGNAL_DU_PSEUDO.asReadonly();

  private SIGNAL_DES_ROLES = signal<string[]>([]);
  roles = this.SIGNAL_DES_ROLES.asReadonly();

  // Subject to notify avatar changes
  avatarChanged$ = new Subject<void>();

  constructor(public http : HttpClient) { }

  setUsername(username : string | null){
    this.SIGNAL_DU_PSEUDO.set(username);
    this.avatarChanged$.next(); // 🔔 Notify avatar change
  }

  setRoles(roles : string[]){
    this.SIGNAL_DES_ROLES.set(roles);
  }

  async register(username : string, email : string, password : string, passwordConfirm : string) : Promise<void>{
    let registerDTO = {
      username : username,
      email : email,
      password : password,
      passwordConfirm : passwordConfirm
    };
    let x = await lastValueFrom(this.http.post<any>(domain + "api/Users/Register", registerDTO));
    console.log(x);
  }

  async login(username : string, password : string) : Promise<void>{
    let loginDTO = {
      username : username,
      password : password
    };
    let x = await lastValueFrom(this.http.post<any>(domain + "api/Users/Login", loginDTO));
    console.log(x);

    localStorage.setItem("token", x.token);
    localStorage.setItem("username", x.username);
    localStorage.setItem("roles", JSON.stringify(x.roles));
    this.setUsername(x.username);
    this.setRoles(x.roles);
  }

  async ProfilePic(formData : any) : Promise<void>{
    let x = await lastValueFrom(this.http.put<any>(domain + "api/Users/ProfilePic", formData));
    return x;
  }

  async changePassword(oldPassword: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
    let body = {
      oldPassword,
      newPassword,
      newPasswordConfirm
    };
    await firstValueFrom(this.http.post(domain + "api/Users/ChangePassword", body));
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}
