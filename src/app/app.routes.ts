import { Routes } from '@angular/router';
import { PlayerDetailsComponent } from './player-details/player-details.component';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { MakePortalLinkComponent } from './make-portal-link/make-portal-link.component';
import { ManagePlayerComponent } from './manage-player/manage-player.component';
import { ManageRolesComponent } from './manage-roles/manage-roles.component';

export const routes: Routes = [
    { path: 'player', component: PlayerDetailsComponent, canActivate: [authGuard] },
    { path: 'login', component: LoginComponent },
    { path: 'about', component: AboutComponent },
    { path: 'contact', component: ContactComponent },
    { path: 'make-portal-link', component: MakePortalLinkComponent },
    { path: 'manage-lists/:id/players', component: ManagePlayerComponent },
    { path: 'manage-roles', component: ManageRolesComponent },
    {
        path: 'manage-targets',
        loadComponent: () => import('./manage-targets/manage-targets.component').then(m => m.ManageTargetsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'manage-lists',
        loadComponent: () => import('./manage-list/manage-list.component').then(m => m.ManageListComponent),
        canActivate: [authGuard]
    }

];
