import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PlayerDataService } from '../services/player-data.service';
import { ListService } from '../services/list.service';
import { HattrickPlayer } from '../models/hattrick.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as Papa from 'papaparse';

@Component({
    selector: 'app-my-players-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, RouterModule],
    templateUrl: './my-players-detail.component.html',
    styleUrl: './my-players-detail.component.css'
})
export class MyPlayersDetailComponent implements OnInit {
    players: HattrickPlayer[] = [];
    selectedPlayer: HattrickPlayer | null = null;
    lists: any[] = [];
    selectedListId: string = '';
    isLoading = false;

    constructor(
        private playerDataService: PlayerDataService,
        private listService: ListService,
        private route: ActivatedRoute,
        private router: Router,
        private zone: NgZone
    ) { }

    ngOnInit() {
        this.loadMyPlayers();
    }

    loadMyPlayers() {
        this.isLoading = true;
        this.playerDataService.getMyPlayers().subscribe({
            next: (res) => {
                this.players = res.players || [];
                this.isLoading = false;

                // Controllo se c'è un ID nella URL per aprire il dettaglio
                const routeId = this.route.snapshot.paramMap.get('id');
                if (routeId) {
                    const p = this.players.find(player => String(player.PlayerID) === routeId || String(player.id) === routeId);
                    if (p) this.selectPlayer(p);
                }
            },
            error: (err) => {
                console.error('Errore caricamento giocatori', err);
                this.isLoading = false;
            }
        });
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (!file) return;

        this.isLoading = true;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Converte automaticamente numeri e booleani
            complete: (result) => {
                this.zone.run(() => {
                    const players: HattrickPlayer[] = result.data as any[];
                    this.importData(players);
                    event.target.value = ''; // Reset input
                });
            },
            error: (err) => {
                console.error('Errore parsing CSV:', err);
                this.isLoading = false;
            }
        });
    }

    private importData(players: HattrickPlayer[]) {
        this.playerDataService.importPlayers(players).subscribe({
            next: (res) => {
                console.log('Import completato:', res);
                this.loadMyPlayers();
            },
            error: (err) => {
                console.error('Errore importazione:', err);
                this.isLoading = false;
            }
        });
    }

    selectPlayer(player: HattrickPlayer) {
        this.selectedPlayer = player;
    }

    closeDetail() {
        this.selectedPlayer = null;
        // Se eravamo su una URL specifica, torniamo alla lista generale
        if (this.route.snapshot.paramMap.get('id')) {
            this.router.navigate(['/my-players']);
        }
    }

    getRatingStars(rating: number): number[] {
        const fullStars = Math.floor(rating || 0);
        return Array(fullStars).fill(0);
    }

    hasHalfStar(rating: number): boolean {
        return ((rating || 0) % 1) >= 0.5;
    }
}
