import { Component, ElementRef, ViewChild } from '@angular/core';
import { UserService } from '../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { buildApiUrl } from '../config/api.config';
import { I18nService } from '../services/i18n.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
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
  activeTab: 'account' | 'security' | 'avatar' | 'sharing' | 'settings' = 'account';
  shareTarget: string = "";
  shareMessage: string = "";
  shareError: string = "";
  sharedWithMe: Array<{ ownerUserId: string; ownerUsername: string; sharedAt: string }> = [];
  isSharing: boolean = false;
  isLoadingShared: boolean = false;

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

  constructor(public userService : UserService, private i18n: I18nService) { }

  ngOnInit() {
    this.userIsConnected = localStorage.getItem("token") != null;
    this.username = localStorage.getItem("username");

    if (this.username) {
      this.imageSrc = this.buildAvatarUrl(this.username);
    }

    const storedTab = localStorage.getItem("profileTab");
    if (storedTab === 'security' || storedTab === 'avatar' || storedTab === 'sharing' || storedTab === 'settings') {
      this.activeTab = storedTab;
    }

    if (this.userIsConnected) {
      void this.loadSharedWithMe();
    }
  }

  private buildAvatarUrl(username: string, useCacheBust: boolean = false): string {
    const cacheBuster = useCacheBust ? `?t=${Date.now()}` : "";
    return buildApiUrl(`/api/Users/GetAvatar/${username}${cacheBuster}`);
  }

  async updateProfilePicture(): Promise<void>{
    if(this.pictureInput == undefined){
      this.pictureError = this.i18n.t('profile.message.uploadInputMissing');
      return;
    }

    let file = this.pictureInput.nativeElement.files[0];

    if(file == null){
      this.pictureError = this.i18n.t('profile.message.uploadNoFile');
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
      this.pictureMessage = this.i18n.t('profile.message.photoUpdated');
    } catch (error: any) {
      this.pictureError = error?.error?.message || error?.error?.Message || this.i18n.t('profile.message.photoUpdateFailed');
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
      this.passwordMessage = this.i18n.t('profile.message.passwordUpdated');
      this.oldPassword = "";
      this.newPassword = "";
      this.newPasswordConfirm = "";
    } catch (error: any) {
      this.passwordError = error.error?.message || error.error?.Message || this.i18n.t('profile.message.passwordUpdateFailed');
    } finally {
      this.isSavingPassword = false;
    }
  }

  setActiveTab(tab: 'account' | 'security' | 'avatar' | 'sharing' | 'settings') {
    this.activeTab = tab;
    localStorage.setItem("profileTab", tab);
  }

  get currentLanguage(): 'en' | 'fr' {
    return this.i18n.getLanguage();
  }

  setLanguage(language: 'en' | 'fr') {
    this.i18n.setLanguage(language);
  }

  async shareList(): Promise<void> {
    const target = this.shareTarget.trim();
    if (!target) {
      return;
    }

    this.isSharing = true;
    this.shareError = "";
    this.shareMessage = "";

    try {
      const response = await this.userService.shareList(target);
      this.shareMessage = response?.Message || response?.message || this.i18n.t('profile.message.shareSuccess');
      this.shareTarget = "";
      await this.loadSharedWithMe();
    } catch (error: any) {
      this.shareError = error?.error?.message || error?.error?.Message || this.i18n.t('profile.message.shareFail');
    } finally {
      this.isSharing = false;
    }
  }

  async unshareList(): Promise<void> {
    const target = this.shareTarget.trim();
    if (!target) {
      return;
    }

    this.isSharing = true;
    this.shareError = "";
    this.shareMessage = "";

    try {
      const response = await this.userService.unshareList(target);
      this.shareMessage = response?.Message || response?.message || this.i18n.t('profile.message.unshareSuccess');
      this.shareTarget = "";
      await this.loadSharedWithMe();
    } catch (error: any) {
      this.shareError = error?.error?.message || error?.error?.Message || this.i18n.t('profile.message.unshareFail');
    } finally {
      this.isSharing = false;
    }
  }

  private async loadSharedWithMe(): Promise<void> {
    this.isLoadingShared = true;

    try {
      this.sharedWithMe = await this.userService.getSharedWithMe();
    } catch (error) {
      this.sharedWithMe = [];
    } finally {
      this.isLoadingShared = false;
    }
  }

}
