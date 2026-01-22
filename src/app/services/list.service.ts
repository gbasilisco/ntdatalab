import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { switchMap, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ListService {
  private API_URL = 'https://nt-data-lab-705728164092.europe-west1.run.app';

  constructor(private http: HttpClient, private auth: AuthService) { }

  private getRequestPayload(method: string, extraData: any = {}): Observable<any> {
    return this.auth.user$.pipe(
      take(1),
      switchMap(user => {
        const payload = {
          action: 'manage_lists',
          method: method,
          email: user?.email,
          ...extraData
        };
        return this.http.post<any>(this.API_URL, payload);
      })
    );
  }

  getLists(): Observable<{ lists: any[] }> {
    return this.getRequestPayload('get_lists');
  }

  createList(name: string): Observable<any> {
    return this.getRequestPayload('create_list', { name });
  }

  deleteList(listId: string): Observable<any> {
    return this.getRequestPayload('delete_list', { listId });
  }

  addPlayer(listId: string, playerId: string): Observable<any> {
    return this.getRequestPayload('add_player', { listId, playerId });
  }

  removePlayer(listId: string, playerId: string): Observable<any> {
    return this.getRequestPayload('remove_player', { listId, playerId });
  }

  getListPlayers(listId: string): Observable<{ players: any[] }> {
    return this.getRequestPayload('get_list_players', { listId });
  }
}
