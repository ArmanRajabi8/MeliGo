import { Routes } from '@angular/router';
import { HubComponent } from './hub/hub.component';
import { ProfileComponent } from './profile/profile.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
    {path:"", redirectTo:"/postList/index", pathMatch:"full"},
    {path:"postList", redirectTo:"/postList/index", pathMatch:"full"},
    {path:"postList/:tab", component:HubComponent}, // Route pour accueil / vos hubs
    {path:"postList/hub/:hubId", component:HubComponent}, // Route pour un hub précis
    {path:"postList/search/:searchText", component:HubComponent}, // Router pour une recherche
    {path:"profile", component:ProfileComponent},
    {path:"register", component:RegisterComponent},
    {path:"login", component:LoginComponent}
 
];