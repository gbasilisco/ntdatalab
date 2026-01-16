import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PlayerService {
// 🔧 QUICK TEST: use a proxy that forwards unsigned requests (you replace this)
private PROXY_URL = 'http://localhost:3000/playerDetails?playerId=';



constructor(private http: HttpClient) {}


getPlayerDetails(playerId: string): Observable<string> {
  console.log("I do call to backend");
return this.http.get(this.PROXY_URL + playerId, {
responseType: 'text',
});
}
}