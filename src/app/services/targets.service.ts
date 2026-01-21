import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { switchMap, take } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export interface UserTarget {
    id?: string;
    role: string;
    name: string;
    variant: string;
    stats: { [key: string]: number };
}

@Injectable({
    providedIn: 'root'
})
export class TargetsService {

    private readonly API_URL = 'https://nt-data-lab-705728164092.europe-west1.run.app';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getEmail(): Observable<string | null> {
        return this.authService.user$.pipe(
            take(1),
            switchMap(user => of(user ? user.email : null))
        );
    }

    getTargets(): Observable<any> {
        return this.getEmail().pipe(
            switchMap(email => {
                if (!email) throw new Error('Utente non autenticato');
                return this.http.post(this.API_URL, {
                    action: 'manage_targets',
                    method: 'get',
                    email: email
                });
            })
        );
    }

    saveTarget(target: UserTarget): Observable<any> {
        return this.getEmail().pipe(
            switchMap(email => {
                if (!email) throw new Error('Utente non autenticato');
                return this.http.post(this.API_URL, {
                    action: 'manage_targets',
                    method: 'save',
                    email: email,
                    target: target
                });
            })
        );
    }

    deleteTarget(targetId: string): Observable<any> {
        return this.getEmail().pipe(
            switchMap(email => {
                if (!email) throw new Error('Utente non autenticato');
                return this.http.post(this.API_URL, {
                    action: 'manage_targets',
                    method: 'delete',
                    email: email,
                    targetId: targetId
                });
            })
        );
    }
}
