import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { switchMap, take } from 'rxjs/operators';
import { HattrickPlayer } from '../models/hattrick.model';

@Injectable({
    providedIn: 'root'
})
export class PlayerDataService {
    private API_URL = 'https://nt-data-lab-705728164092.europe-west1.run.app';

    constructor(private http: HttpClient, private auth: AuthService) { }

    private getRequestPayload(method: string, extraData: any = {}): Observable<any> {
        return this.auth.user$.pipe(
            take(1),
            switchMap(user => {
                const payload = {
                    action: 'manage_players',
                    method: method,
                    requesterEmail: user?.email,
                    ...extraData
                };
                return this.http.post<any>(this.API_URL, payload);
            })
        );
    }

    getListPlayersDetailed(listId: string): Observable<{ players: HattrickPlayer[] }> {
        return this.getRequestPayload('get_list_players_detailed', { listId });
    }

    getMyPlayers(): Observable<{ players: HattrickPlayer[] }> {
        return this.getRequestPayload('get_my_players');
    }

    getPlayer(playerId: string): Observable<{ player: HattrickPlayer }> {
        return this.getRequestPayload('get_player', { playerId });
    }

    savePlayer(playerData: HattrickPlayer): Observable<any> {
        return this.getRequestPayload('save_player', { playerData });
    }

    importPlayers(players: HattrickPlayer[]): Observable<any> {
        return this.getRequestPayload('import_players', { players });
    }

    syncPlayers(): Observable<any> {
        return this.getRequestPayload('sync_players');
    }

    searchPlayers(query: string, listId?: string): Observable<{ players: HattrickPlayer[] }> {
        return this.getRequestPayload('search_players', { query, listId });
    }
}
