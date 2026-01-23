import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ListService } from '../services/list.service';
import { TranslateModule } from '@ngx-translate/core';
import { PlayerDataService } from '../services/player-data.service';

@Component({
  selector: 'app-manage-player',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './manage-player.component.html',
  styleUrl: './manage-player.component.css'
})
export class ManagePlayerComponent implements OnInit {
  listId: string = '';
  players: any[] = [];
  newPlayerId: string = '';
  searchQuery: string = '';
  searchResults: any[] = [];
  isLoading = false;
  isSearching = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private listService: ListService,
    private playerDataService: PlayerDataService
  ) { }

  ngOnInit() {
    this.listId = this.route.snapshot.paramMap.get('id') || '';
    if (this.listId) {
      this.loadPlayers();
    }
  }

  loadPlayers() {
    this.isLoading = true;
    this.listService.getListPlayers(this.listId).subscribe({
      next: (res) => {
        this.players = res.players;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  searchPlayers() {
    if (this.searchQuery.length < 2) {
      this.searchResults = [];
      return;
    }
    this.isSearching = true;
    this.playerDataService.searchPlayers(this.searchQuery, this.listId).subscribe({
      next: (res) => {
        this.searchResults = res.players;
        this.isSearching = false;
      },
      error: (err) => {
        console.error(err);
        this.isSearching = false;
      }
    });
  }

  showAll() {
    this.isSearching = true;
    this.searchQuery = '';
    this.playerDataService.searchPlayers('', this.listId).subscribe({
      next: (res) => {
        this.searchResults = res.players;
        this.isSearching = false;
      },
      error: (err) => {
        console.error(err);
        this.isSearching = false;
      }
    });
  }

  addPlayer(playerId?: string) {
    const pid = playerId || this.newPlayerId;
    if (!pid) return;

    this.errorMessage = '';
    this.listService.addPlayer(this.listId, pid).subscribe({
      next: (res) => {
        if (res.status === 'error') {
          this.errorMessage = res.message;
        } else {
          this.newPlayerId = '';
          this.searchQuery = '';
          this.searchResults = [];
          this.loadPlayers();
        }
      },
      error: (err) => {
        console.error('Errore aggiunta:', err);
        // Spesso l'errore di permessi arriva come 500 o 400 con un messaggio specifico
        if (err.error && err.error.error) {
          this.errorMessage = err.error.error;
        } else {
          this.errorMessage = "Errore durante l'aggiunta del giocatore.";
        }
      }
    });
  }

  removePlayer(playerId: string) {
    if (!confirm('Rimuovere giocatore?')) return;

    this.listService.removePlayer(this.listId, playerId).subscribe({
      next: () => this.loadPlayers(),
      error: (err) => console.error(err)
    });
  }
}
