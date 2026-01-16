import { Routes } from '@angular/router';
import { PlayerDetailsComponent } from './player-details/player-details.component';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { MakePortalLinkComponent } from './make-portal-link/make-portal-link.component';

export const routes: Routes = [
    { path: 'player', component: PlayerDetailsComponent, canActivate: [authGuard]},
     { path: 'login', component: LoginComponent},
     { path: 'about', component: AboutComponent},
     { path: 'contact', component: ContactComponent},
      { path: 'make-portal-link', component: MakePortalLinkComponent}
];
