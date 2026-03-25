import { Routes } from '@angular/router';
import { HubComponent } from './hub/hub.component';
import { ProfileComponent } from './profile/profile.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
    {path:"", component: HomeComponent},
    {path:"home", component: HomeComponent},
    {path:"postList", redirectTo:"/postList/index", pathMatch:"full"},
    {path:"postList/:tab", component:HubComponent}, // Route pour accueil / vos hubs
    {path:"postList/hub/:hubId", component:HubComponent}, // Route pour un hub précis
    {path:"postList/search/:searchText", component:HubComponent}, // Router pour une recherche
    {path:"profile", component:ProfileComponent},
    {path:"register", component:RegisterComponent},
    {path:"login", component:LoginComponent},
    {path:"**", redirectTo:"", pathMatch:"full"}
 
];
