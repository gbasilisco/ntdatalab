import { Component } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login() {
    this.authService
      .loginWithGoogle()
      .then(() => this.router.navigate(['/player']))
      .catch((err) => {
        // keep console logging minimal; UI messaging can be added later if needed
        console.error('Login failed', err);
      });
  }

}
