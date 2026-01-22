import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { switchMap, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private API_URL = 'https://nt-data-lab-705728164092.europe-west1.run.app';

  constructor(private http: HttpClient, private auth: AuthService) { }

  private getRequestPayload(method: string, extraData: any = {}): Observable<any> {
    return this.auth.user$.pipe(
      take(1),
      switchMap(user => {
        const payload = {
          action: 'manage_roles',
          method: method,
          requesterEmail: user?.email,
          ...extraData
        };
        return this.http.post<any>(this.API_URL, payload);
      })
    );
  }

  getRole(email: string): Observable<{ role: string }> {
    return this.getRequestPayload('get_role', { email });
  }

  setRole(targetEmail: string, newRole: string, teamName?: string, teamType?: string): Observable<any> {
    return this.getRequestPayload('set_role', { targetEmail, newRole, teamName, teamType });
  }

  getAllUsers(): Observable<{ users: any[] }> {
    return this.getRequestPayload('get_all');
  }

  getCoachTeams(): Observable<{ teams: any[] }> {
    return this.getRequestPayload('get_coach_teams');
  }
}
