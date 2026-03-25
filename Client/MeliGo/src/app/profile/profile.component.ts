import { Component, ElementRef, ViewChild } from '@angular/core';
import { UserService } from '../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { buildApiUrl } from '../config/api.config';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {

  @ViewChild("myFileInput", {static : false}) pictureInput ?: ElementRef;
  userIsConnected : boolean = false;
  imageSrc = "assets/images/default.jpg";
  passwordMessage: string = "";
  passwordError: string = "";
  pictureMessage: string = "";
  pictureError: string = "";
  isSavingPassword: boolean = false;
  isUploadingPicture: boolean = false;

  imgFileSelected(event: any) {
    this.pictureError = "";
    this.pictureMessage = "";

    if (event.target.files && event.target.files[0]) {
      this.imageSrc = URL.createObjectURL(event.target.files[0]);
    }
  }


  // Vous êtes obligés d'utiliser ces trois propriétés
  oldPassword : string = "";
  newPassword : string = "";
  newPasswordConfirm : string = "";

  username : string | null = null;

  constructor(public userService : UserService) { }

  ngOnInit() {
    this.userIsConnected = localStorage.getItem("token") != null;
    this.username = localStorage.getItem("username");

    if (this.username) {
      this.imageSrc = this.buildAvatarUrl(this.username);
    }
  }

  private buildAvatarUrl(username: string, useCacheBust: boolean = false): string {
    const cacheBuster = useCacheBust ? `?t=${Date.now()}` : "";
    return buildApiUrl(`/api/Users/GetAvatar/${username}${cacheBuster}`);
  }

  async updateProfilePicture(): Promise<void>{
    if(this.pictureInput == undefined){
      this.pictureError = "The upload input is not ready yet.";
      return;
    }

    let file = this.pictureInput.nativeElement.files[0];

    if(file == null){
      this.pictureError = "Choose an image before uploading.";
      return;
    }

    this.isUploadingPicture = true;
    this.pictureError = "";
    this.pictureMessage = "";

    let formData = new FormData();
    formData.append("monImage", file, file.name);

    try {
      await this.userService.ProfilePic(formData);

      if (this.username) {
        this.imageSrc = this.buildAvatarUrl(this.username, true);
      }

      this.userService.avatarChanged$.next();
      this.pictureMessage = "Profile photo updated.";
    } catch (error: any) {
      this.pictureError = error?.error?.message || error?.error?.Message || "Could not update your profile picture.";
    } finally {
      this.isUploadingPicture = false;
    }
  }

  async changePassword(): Promise<void> {
    this.passwordError = "";
    this.passwordMessage = "";
    this.isSavingPassword = true;

    try {
      await this.userService.changePassword(this.oldPassword, this.newPassword, this.newPasswordConfirm);
      this.passwordMessage = "Password updated successfully.";
      this.oldPassword = "";
      this.newPassword = "";
      this.newPasswordConfirm = "";
    } catch (error: any) {
      this.passwordError = error.error?.message || error.error?.Message || "Could not update your password.";
    } finally {
      this.isSavingPassword = false;
    }
  }

}
