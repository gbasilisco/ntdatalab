import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PlayerDataService } from '../services/player-data.service';
import { HattrickPlayer } from '../models/hattrick.model';
import { RouterModule } from '@angular/router';
import { ListService } from '../services/list.service';
import { RoleService } from '../services/role.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-nationals-player',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, RouterModule],
    templateUrl: './nationals-player.component.html',
    styleUrl: './nationals-player.component.css'
})
export class NationalsPlayerComponent implements OnInit {
    groupedPlayers: { [key: string]: HattrickPlayer[] } = {};
    allPlayers: HattrickPlayer[] = []; // Master list
    selectedPlayer: HattrickPlayer | null = null;
    isLoading = false;

    // Maps NativeLeagueID -> Array of compatible Lists
    availableListsByLeague: { [key: string]: any[] } = {};

    // Selection state: map playerId -> selectedListId
    selectedLists: { [key: string]: string } = {};

    // Filters
    filters: any = {
        minAge: null,
        maxAge: null,
        minTSI: null,
        minKeeper: null,
        minPlaymaking: null,
        minScoring: null,
        minPassing: null,
        minWinger: null,
        minDefending: null,
        minSetPieces: null,
        specialty: '', // '0' is no spec, but we treat empty as ALL
        nativeLeagueId: null
    };

    specialties = [
        { id: 0, label: 'Nessuna' },
        { id: 1, label: 'Tecnico' },
        { id: 2, label: 'Veloce' },
        { id: 3, label: 'Potente' },
        { id: 4, label: 'Imprevedibile' },
        { id: 5, label: 'Colpo di testa' },
        { id: 6, label: 'Resistente' } // Hattrick 6=Resilient? Spesso è 5 Head, 4 Unpred, 3 Powerful, 2 Quick, 1 Tech. check mapping IDs
    ];

    // Sorting
    sortColumn: string = '';
    sortDirection: 'asc' | 'desc' = 'asc';

    constructor(
        private playerDataService: PlayerDataService,
        private listService: ListService,
        private roleService: RoleService
    ) { }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading = true;

        // Use forkJoin to load players, lists and user context in parallel
        forkJoin({
            playersRes: this.playerDataService.searchPlayers('', undefined),
            listsRes: this.listService.getLists(),
            userContext: this.roleService.getUserContext()
        }).subscribe({
            next: ({ playersRes, listsRes, userContext }) => {
                this.allPlayers = playersRes.players || []; // Store master
                const lists = listsRes.lists || [];

                this.applyFilters(); // Initial group
                this.mapListsToLeagues(lists, userContext);

                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading data', err);
                this.isLoading = false;
            }
        });
    }

    applyFilters() {
        let filtered = this.allPlayers;

        if (this.filters.minAge != null) filtered = filtered.filter(p => p.Age >= this.filters.minAge);
        if (this.filters.maxAge != null) filtered = filtered.filter(p => p.Age <= this.filters.maxAge);
        if (this.filters.minTSI != null) filtered = filtered.filter(p => p.TSI >= this.filters.minTSI);

        if (this.filters.minKeeper != null) filtered = filtered.filter(p => p.KeeperSkill >= this.filters.minKeeper);
        if (this.filters.minPlaymaking != null) filtered = filtered.filter(p => p.PlaymakerSkill >= this.filters.minPlaymaking);
        if (this.filters.minScoring != null) filtered = filtered.filter(p => p.ScorerSkill >= this.filters.minScoring);
        if (this.filters.minPassing != null) filtered = filtered.filter(p => p.PassingSkill >= this.filters.minPassing);
        if (this.filters.minWinger != null) filtered = filtered.filter(p => p.WingerSkill >= this.filters.minWinger);
        if (this.filters.minDefending != null) filtered = filtered.filter(p => p.DefenderSkill >= this.filters.minDefending);
        if (this.filters.minSetPieces != null) filtered = filtered.filter(p => p.SetPiecesSkill >= this.filters.minSetPieces);

        if (this.filters.specialty !== '') {
            filtered = filtered.filter(p => p.Specialty == this.filters.specialty);
        }

        if (this.filters.nativeLeagueId != null) {
            filtered = filtered.filter(p => p.NativeLeagueID == this.filters.nativeLeagueId);
        }

        this.groupPlayersByLeague(filtered);
    }

    clearFilters() {
        this.filters = {
            minAge: null, maxAge: null, minTSI: null,
            minKeeper: null, minPlaymaking: null, minScoring: null,
            minPassing: null, minWinger: null, minDefending: null, minSetPieces: null,
            specialty: '',
            nativeLeagueId: null
        };
        this.applyFilters();
    }

    sort(column: string) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        // Re-apply grouping which will also apply sorting
        this.applyFilters();
    }

    private groupPlayersByLeague(players: HattrickPlayer[]) {
        // Sort players before grouping if sort is active
        if (this.sortColumn) {
            players = [...players].sort((a: any, b: any) => {
                let valA = a[this.sortColumn];
                let valB = b[this.sortColumn];

                // Handle different types
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        this.groupedPlayers = players.reduce((acc, player) => {
            const leagueId = String(player.NativeLeagueID || 'N/A');
            if (!acc[leagueId]) {
                acc[leagueId] = [];
            }
            acc[leagueId].push(player);
            return acc;
        }, {} as { [key: string]: HattrickPlayer[] });
    }

    private mapListsToLeagues(lists: any[], userContext: any) {
        // Build a map of teamID -> NativeLeagueID
        const teamLeagueMap: { [key: string]: string } = {};

        // 1. Owned teams
        if (userContext.owned_teams) {
            userContext.owned_teams.forEach((t: any) => {
                if (t.NativeLeagueID) teamLeagueMap[t.id] = String(t.NativeLeagueID);
            });
        }

        // 2. Memberships
        if (userContext.memberships) {
            userContext.memberships.forEach((m: any) => {
                if (m.team_info && m.team_info.NativeLeagueID) {
                    teamLeagueMap[m.team_id] = String(m.team_info.NativeLeagueID);
                }
            });
        }

        // Group lists by NativeLeagueID
        this.availableListsByLeague = {};

        lists.forEach(list => {
            const teamId = list.team_id;
            const leagueId = teamLeagueMap[teamId];

            if (leagueId) {
                if (!this.availableListsByLeague[leagueId]) {
                    this.availableListsByLeague[leagueId] = [];
                }
                this.availableListsByLeague[leagueId].push(list);
            }
        });
    }

    addPlayerToList(player: HattrickPlayer) {
        const listId = this.selectedLists[player.PlayerID];
        if (!listId) return; // No list selected

        this.listService.addPlayer(listId, String(player.PlayerID)).subscribe({
            next: (res) => {
                if (res.status === 'error') {
                    alert(res.message);
                } else {
                    alert('Player added successfully!');
                    // Optional: reset selection
                    this.selectedLists[player.PlayerID] = '';
                }
            },
            error: (err) => {
                console.error('Error adding player to list', err);
                alert('Error adding player');
            }
        });
    }

    selectPlayer(player: HattrickPlayer) {
        this.selectedPlayer = player;
    }

    closeDetail() {
        this.selectedPlayer = null;
    }

    getRatingStars(rating: number): number[] {
        const fullStars = Math.floor(rating || 0);
        return Array(fullStars).fill(0);
    }

    hasHalfStar(rating: number): boolean {
        return ((rating || 0) % 1) >= 0.5;
    }
}
