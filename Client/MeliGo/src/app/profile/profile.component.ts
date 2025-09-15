import { Component, ElementRef, ViewChild } from '@angular/core';
import { UserService } from '../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {

  @ViewChild("myFileInput", {static : false}) pictureInput ?: ElementRef;
  userIsConnected : boolean = false;
  imageSrc = "/assets/images/default.png";

  imgFileSelected(event: any) {
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
  }

  async ProfilePic(): Promise<void>{
    // Il faut vérifier si l'<input> est actuellement visible dans la page !
    if(this.pictureInput == undefined){
      console.log("Input HTML non chargé.");
      return;
  }

  // On récupère le premier (ou le seul) fichier dans l'<input> !
  let file = this.pictureInput.nativeElement.files[0];

  if(file == null){
      console.log("Input HTML ne contient aucune image.");
      return;
  }

  // Préparation du FormData avec l'image
  let formData = new FormData();
  formData.append("monImage", file, file.name);

  await this.userService.ProfilePic(formData)
  location.reload();
  }

  async changePassword(): Promise<void> {
  try {
    await this.userService.changePassword(this.oldPassword, this.newPassword, this.newPasswordConfirm);
    alert("Mot de passe modifié avec succès !");
    this.oldPassword = "";
    this.newPassword = "";
    this.newPasswordConfirm = "";
  } catch (error: any) {
    alert(error.error?.Message || "Erreur lors du changement de mot de passe.");
  }
}

}
