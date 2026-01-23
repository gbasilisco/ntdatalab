import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut } from '@angular/fire/auth';
import { authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user$: Observable<any>;
  private API_URL = 'https://nt-data-lab-705728164092.europe-west1.run.app';

  constructor(private auth: Auth, private http: HttpClient, private router: Router) {
    this.user$ = authState(this.auth);
  }

  loginWithGoogle() {
    return signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  logout() {
    return signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }

  getUserProfile(email: string): Observable<any> {
    const payload = {
      action: 'manage_users',
      method: 'get_profile',
      email: email
    };
    return this.http.post<any>(this.API_URL, payload);
  }

  updateUserProfile(email: string, profile: any): Observable<any> {
    const payload = {
      action: 'manage_users',
      method: 'update_profile',
      email: email,
      profile: profile
    };
    return this.http.post<any>(this.API_URL, payload);
  }
}
