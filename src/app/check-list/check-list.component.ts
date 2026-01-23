import { Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import * as Papa from 'papaparse';

import { CsvMapperService } from '../services/csv-mapper.service';
import { HattrickCsvRow, PlayerResult, AnalysisResponse } from '../models/hattrick.model';
import { TranslateModule } from '@ngx-translate/core';
import { TargetsService } from '../services/targets.service';
import { AuthService } from '../auth/auth.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-check-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, TranslateModule],
  templateUrl: './check-list.component.html',
  styleUrl: './check-list.component.css'
})
export class CheckListComponent implements OnInit {

  // --- CONFIGURAZIONE DROPDOWN ---
  targetOptions = ['U21', 'NT'];
  variantOptions = ['Normal']; // Saranno popolati dinamicamente

  userEmail: string | null = null;

  roleOptions = [
    { label: 'Centrocampista (Midfielder)', value: 'midfielder' },
    { label: 'Difensore (Defender)', value: 'defender' },
    { label: 'Terzino (Wingback)', value: 'wingback' },
    { label: 'Attaccante (Forward)', value: 'forward' },
    { label: 'Ala (Winger)', value: 'winger' },
    { label: 'Portiere (Goalkeeper)', value: 'goalkeeper' }
  ];

  // --- STATO SELEZIONATO ---
  selectedTarget = 'U21';
  selectedVariant = 'Normal';
  selectedRole = 'midfielder';

  // --- STATO APPLICAZIONE ---
  playerResults: PlayerResult[] = [];
  isProcessing = false;

  // --- CSV IN MEMORIA ---
  private csvRows: HattrickCsvRow[] = [];

  // --- BACKEND ---
  private readonly API_URL = 'https://nt-data-lab-705728164092.europe-west1.run.app';

  constructor(
    private http: HttpClient,
    private mapper: CsvMapperService,
    private zone: NgZone,
    private targetsService: TargetsService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // 1. Ottieni Email Utente
    this.authService.user$.pipe(take(1)).subscribe(user => {
      this.userEmail = user ? user.email : null;

      // 2. Se loggato, scarica i target custom
      if (this.userEmail) {
        this.fetchUserTargets();
      }
    });
  }

  fetchUserTargets() {
    this.targetsService.getTargets().subscribe({
      next: (res) => {
        const targets = res.targets || [];

        // Estrai nomi univoci e varianti univoche
        const customNames = targets.map((t: any) => t.name);
        const customVariants = targets.map((t: any) => t.variant);

        // Merge con default avoiding duplicates
        this.targetOptions = Array.from(new Set([...this.targetOptions, ...customNames]));
        this.variantOptions = Array.from(new Set([...this.variantOptions, ...customVariants, 'Counter-attack', 'PNF']));
      },
      error: (err) => console.error('Errore fetch target', err)
    });
  }

  // =====================================================
  // CSV UPLOAD
  // =====================================================
  onFileSelected(event: any): void {
    const input = event.target;
    const file = event.target.files[0];

    if (!file) return;

    this.playerResults = [];
    this.csvRows = [];
    this.isProcessing = true;

    this.processCsvInMemory(file);
    input.value = '';
  }

  private processCsvInMemory(file: File): void {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        this.zone.run(() => {
          this.csvRows = result.data as HattrickCsvRow[];
          this.runAnalysisFromCsv();
        });
      },
      error: (err) => {
        console.error('Errore CSV:', err);
        this.isProcessing = false;
      }
    });
  }

  // =====================================================
  // RILANCIO ANALISI (CSV → API)
  // =====================================================
  private runAnalysisFromCsv(): void {
    if (!this.csvRows.length) {
      this.isProcessing = false;
      return;
    }

    this.playerResults = [];
    this.isProcessing = true;

    this.csvRows.forEach(row => {
      if (!row.PlayerID) return;

      const payload = this.mapper.mapRowToPayload(
        row,
        this.selectedTarget,
        this.selectedVariant,
        this.selectedRole
      );

      if (!payload) return;

      const playerEntry: PlayerResult = {
        id: row.PlayerID,
        fullName: `${row.FirstName} ${row.LastName}`,
        status: 'LOADING',
        trainingType: payload.training_type,
        stamina: payload.stamina_share,
        lastUpdate: row.Updated,
        age: row.Age,
        ageDays: row.AgeDays,
        lastScoutNote: row.LastScoutNote,
        transferListed: row.TransferListed,
        teamTrainerSkill: row.TeamTrainerSkill,
        owningUserID: row.OwningUserID
      };

      this.playerResults.push(playerEntry);
      this.analyzePlayer(payload, playerEntry);
    });

    this.isProcessing = false;
  }

  // =====================================================
  // EVENTI UI
  // =====================================================
  onRoleChange(): void {
    if (!this.csvRows.length) return;
    this.runAnalysisFromCsv();
  }

  onTargetChange(): void {
    if (!this.csvRows.length) return;
    this.runAnalysisFromCsv();
  }

  onVariantChange(): void {
    if (!this.csvRows.length) return;
    this.runAnalysisFromCsv();
  }

  // =====================================================
  // API CALL
  // =====================================================
  private analyzePlayer(payload: any, entry: PlayerResult): void {
    // Aggiungi email al payload per il backend
    const fullPayload = { ...payload, email: this.userEmail };

    this.http.post<AnalysisResponse>(this.API_URL, fullPayload).subscribe({
      next: (res) => {
        entry.analysis = res;

        const roleStatus = res['4_role_targets']?.status;
        const staminaStatus = res['5_stamina']?.status;
        const compStatus = res['3_compatibility']?.status;

        if (
          roleStatus === 'COMPLETED' &&
          staminaStatus === 'OK' &&
          compStatus === 'OK'
        ) {
          entry.status = 'SUCCESS';
        } else if (
          roleStatus === 'IN_PROGRESS' ||
          staminaStatus === 'WARNING' ||
          compStatus === 'WARNING'
        ) {
          entry.status = 'WARNING';
        } else {
          entry.status = 'ERROR';
        }
      },
      error: (err) => {
        console.error(`Errore API Player ${entry.id}:`, err);
        entry.status = 'ERROR';
        entry.error = 'Errore di connessione al server';
      }
    });
  }
}
