import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  userid: string = '';
  teamidsStr: string = '';
  loading = false;
  email: string | null = null;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.email = user.email;
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  onSubmit() {
    if (!this.email || !this.userid || !this.teamidsStr) {
      console.warn('Dati mancanti per la registrazione');
      return;
    }

    this.loading = true;
    const team_ids = this.teamidsStr.split(',').map(s => s.trim()).filter(s => s !== '');

    console.log('CHIAMATA BACKEND: Profilo in salvataggio...', { email: this.email, userid: this.userid, team_ids });

    this.authService.updateUserProfile(this.email, {
      userid: this.userid,
      team_ids: team_ids
    }).subscribe({
      next: (res) => {
        console.log('SUCCESSO BACKEND:', res);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('ERRORE BACKEND:', err);
        this.loading = false;
        alert('Errore durante il salvataggio. Controlla la console.');
      }
    });
  }
}
