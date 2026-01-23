import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, NavigationEnd, ActivatedRoute, ActivationEnd } from '@angular/router';
import { RouterModule } from '@angular/router';
import * as Papa from 'papaparse';

import { CsvMapperService } from './services/csv-mapper.service';
import { HattrickCsvRow, PlayerResult, AnalysisResponse } from './models/hattrick.model';
import { AuthService } from './auth/auth.service';
import { PlayerDataService } from './services/player-data.service';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { MaterialModule } from './material/material.module';
import { MakePortalLinkComponent } from './make-portal-link/make-portal-link.component';
import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule, MaterialModule, TranslateModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {

  title = 'NT Data Lab';
  compName = '';
  menuOpen = false;

  constructor(
    private router: Router,
    public authService: AuthService,
    private playerDataService: PlayerDataService,
    private translate: TranslateService
  ) {

    // 1. Imposta le lingue disponibili (opzionale ma consigliato)
    translate.addLangs(['it', 'en']);

    // 2. Imposta la lingua di fallback base
    translate.setDefaultLang('it');

    // 3. ✅ LOGICA DI RECUPERO LINGUA SALVATA
    // Verifica se localStorage esiste (per evitare errori se usi SSR)
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('selectedLang');

      if (savedLang) {
        // Se c'è una scelta salvata, usala
        translate.use(savedLang);
      } else {
        // Altrimenti prova a prendere la lingua del browser
        const browserLang = translate.getBrowserLang();
        // Se la lingua del browser è 'it' o 'en' usala, altrimenti usa 'it'
        const langToUse = browserLang?.match(/it|en/) ? browserLang : 'it';
        translate.use(langToUse);
      }
    } else {
      // Fallback se localStorage non è disponibile
      translate.use('it');
    }

    // Logica Router esistente
    router.events.subscribe((val) => {
      if (val instanceof ActivationEnd) {
        this.compName = val.snapshot.component!.name
        console.log('componentName:', this.compName);
        this.menuOpen = false; // Close mobile menu on navigation
      }
    });

    // ✅ LOGICA DI REDIRECT PER REGISTRAZIONE E SYNC GIOCATORI
    this.authService.user$.subscribe(user => {
      if (user) {
        // 1. Sync giocatori da Mock (XML)
        this.playerDataService.syncPlayers().subscribe({
          next: (res) => console.log('Sync giocatori completato:', res),
          error: (err) => console.error('Errore sync giocatori:', err)
        });

        // 2. Controllo profilo
        this.authService.getUserProfile(user.email).subscribe(res => {
          if (!res.profile && this.router.url !== '/register' && this.router.url !== '/login') {
            this.router.navigate(['/register']);
          }
        });
      }
    });
  }

  // ✅ MODIFICATA: Salva la scelta quando cambi lingua
  changeLanguage(lang: string) {
    this.translate.use(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('selectedLang', lang);
    }
    this.menuOpen = false;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  logout() {
    this.authService.logout();
  }
}