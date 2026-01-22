import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ListService } from '../services/list.service';
import { TranslateModule } from '@ngx-translate/core';

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
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private listService: ListService
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

  addPlayer() {
    if (!this.newPlayerId) return;

    this.listService.addPlayer(this.listId, this.newPlayerId).subscribe({
      next: (res) => {
        this.newPlayerId = '';
        this.loadPlayers();
      },
      error: (err) => console.error(err)
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
