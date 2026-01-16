import { Component } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  constructor(private authService: AuthService) {}

  login() {
    this.authService.loginWithGoogle();
  }

}
